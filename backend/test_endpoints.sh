#!/usr/bin/env bash
# Exercises every backend endpoint, including per-device isolation checks.
B=http://localhost:8000
pass=0; fail=0
chk() { # chk <name> <expected_code> <actual_code>
  if [ "$2" = "$3" ]; then echo "PASS $1 ($3)"; pass=$((pass+1)); else echo "FAIL $1 expected $2 got $3"; fail=$((fail+1)); fi
}
code() { curl -s -o /tmp/out.json -w '%{http_code}' "$@"; }

echo "=== Health ==="
chk "GET /" 200 "$(code $B/)"
chk "GET /health" 200 "$(code $B/health)"
chk "GET /openapi.json" 200 "$(code $B/openapi.json)"

echo "=== Device registration (laptop vs phone) ==="
LAPTOP=$(curl -s -X POST $B/device/register -H 'Content-Type: application/json' -d '{
 "profile":{"label":"Judge Laptop","os_name":"Windows 11","browser":"Chrome","cpu_cores":16,
 "device_memory_gb":32,"gpu_renderer":"NVIDIA GeForce RTX 4070","screen_width":2560,"screen_height":1440,
 "downlink_mbps":80,"is_mobile":false}}')
LID=$(echo "$LAPTOP" | python3 -c 'import sys,json;print(json.load(sys.stdin)["device_id"])')
LTIER=$(echo "$LAPTOP" | python3 -c 'import sys,json;print(json.load(sys.stdin)["adaptation"]["tier"])')
PHONE=$(curl -s -X POST $B/device/register -H 'Content-Type: application/json' -d '{
 "profile":{"label":"Judge Phone","os_name":"Android 13","browser":"Chrome Mobile","cpu_cores":4,
 "device_memory_gb":3,"gpu_renderer":"SwiftShader","screen_width":390,"screen_height":844,
 "downlink_mbps":1.2,"is_mobile":true,"touch_support":true,"battery_level":0.15,"battery_charging":false}}')
PID=$(echo "$PHONE" | python3 -c 'import sys,json;print(json.load(sys.stdin)["device_id"])')
PTIER=$(echo "$PHONE" | python3 -c 'import sys,json;print(json.load(sys.stdin)["adaptation"]["tier"])')
echo "laptop=$LID tier=$LTIER | phone=$PID tier=$PTIER"
chk "laptop tier is high" "high" "$LTIER"
chk "phone tier is lite" "lite" "$PTIER"
chk "device ids differ" "different" "$([ "$LID" != "$PID" ] && echo different || echo same)"

echo "=== Agents scoped to laptop device ==="
tutor() { curl -s -X POST $B/agent/tutor -H 'Content-Type: application/json' -d "{
 \"device_id\":\"$1\",\"child_id\":\"child-$1\",\"session_id\":\"sess-$1\",\"lesson_id\":\"lesson-1\",
 \"objective\":\"Make the sprite move\",\"workspace_blocks\":[\"s_when_flag\"],
 \"user_message\":\"$2\"}"; }
T1=$(tutor "$LID" "Give me a hint")
echo "$T1" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("  tutor tier:",d["device_tier"],"episode:",d["episode_id"],"trace:",len(d["reasoning_trace"]))'
T2=$(tutor "$PID" "Give me a hint")
echo "$T2" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("  tutor tier:",d["device_tier"],"episode:",d["episode_id"],"trace:",len(d["reasoning_trace"]))'
chk "tutor adapts tier (laptop)" "high" "$(echo "$T1" | python3 -c 'import sys,json;print(json.load(sys.stdin)["device_tier"])')"
chk "tutor adapts tier (phone)" "lite" "$(echo "$T2" | python3 -c 'import sys,json;print(json.load(sys.stdin)["device_tier"])')"

# extra laptop-only traffic so counters diverge
tutor "$LID" "another hint" > /dev/null
chk "POST /agent/curriculum" 200 "$(code -X POST $B/agent/curriculum -H 'Content-Type: application/json' -d "{\"device_id\":\"$LID\",\"child_id\":\"child-$LID\",\"completed_lessons\":[],\"current_level\":\"Bronze\",\"total_xp\":0}")"
chk "POST /agent/business-insights" 200 "$(code -X POST $B/agent/business-insights -H 'Content-Type: application/json' -d "{\"device_id\":\"$LID\",\"total_students\":6,\"active_subscriptions\":6,\"total_revenue\":12000,\"average_score\":88,\"total_completed_missions\":40,\"school_count\":2}")"

echo "=== Per-device telemetry / episodes / memory ==="
chk "POST /device/{id}/heartbeat" 200 "$(code -X POST $B/device/$LID/heartbeat -H 'Content-Type: application/json' -d '{"fps":60,"js_heap_used_mb":48.2,"battery_level":0.9,"battery_charging":true,"active_page":"/levels"}')"
chk "GET /device/{id}/telemetry" 200 "$(code $B/device/$LID/telemetry)"
LEP=$(curl -s $B/device/$LID/episodes | python3 -c 'import sys,json;print(json.load(sys.stdin)["count"])')
PEP=$(curl -s $B/device/$PID/episodes | python3 -c 'import sys,json;print(json.load(sys.stdin)["count"])')
echo "  laptop episodes=$LEP phone episodes=$PEP"
chk "laptop has 4 episodes" "4" "$LEP"
chk "phone has 1 episode (isolated)" "1" "$PEP"
LMEM=$(curl -s $B/device/$LID/memory | python3 -c 'import sys,json;print(json.load(sys.stdin)["total_turns"])')
PMEM=$(curl -s $B/device/$PID/memory | python3 -c 'import sys,json;print(json.load(sys.stdin)["total_turns"])')
echo "  laptop turns=$LMEM phone turns=$PMEM"
chk "laptop memory turns" "4" "$LMEM"
chk "phone memory isolated" "2" "$PMEM"
chk "GET /device (list)" 200 "$(code $B/device)"
chk "GET /device/unknown/telemetry -> 404" 404 "$(code $B/device/nope/telemetry)"
chk "DELETE /device/{id}/memory" 200 "$(code -X DELETE $B/device/$LID/memory)"
chk "memory cleared" "0" "$(curl -s $B/device/$LID/episodes | python3 -c 'import sys,json;print(json.load(sys.stdin)["count"])')"
chk "phone untouched by laptop reset" "1" "$(curl -s $B/device/$PID/episodes | python3 -c 'import sys,json;print(json.load(sys.stdin)["count"])')"
chk "DELETE /device/{id}" 200 "$(code -X DELETE $B/device/$LID)"
chk "DELETE /device/{id} again -> 404" 404 "$(code -X DELETE $B/device/$LID)"

echo "=== Legacy / validation ==="
chk "DELETE /agent/memory/{c}/{s}" 200 "$(code -X DELETE $B/agent/memory/c1/s1)"
chk "POST /agent/tutor invalid -> 422" 422 "$(code -X POST $B/agent/tutor -H 'Content-Type: application/json' -d '{"child_id":"x"}')"
chk "anonymous tutor (no device_id)" 200 "$(code -X POST $B/agent/tutor -H 'Content-Type: application/json' -d '{"child_id":"anon","session_id":"s","lesson_id":"lesson-1","objective":"move","workspace_blocks":[]}')"

echo
echo "PASS=$pass FAIL=$fail"
[ "$fail" = 0 ]
