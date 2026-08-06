# ⚡ AMD Cloud GPU Instance Connection Guide

Your project is configured to pair with your **AMD Cloud Instance** (AMD Developer Cloud / AMD Instinct MI300X Cloud VM).

---

## 🗝️ Registered SSH Key Details
- **Public Key (`id_ed25519.pub`)**: `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBnAEFlOGzezTg/4zmTpbIm3HCaeW7OMcCrfBwwoLMSm tomarianoor@gmail.com`
- **Private Key**: `C:\Users\brown\.ssh\id_ed25519`

---

## 🌐 Connecting to AMD Cloud Instance

### 1. Direct SSH Connection
In your command terminal, connect to your AMD Cloud VM:

```bash
ssh -i C:\Users\brown\.ssh\id_ed25519 ubuntu@<AMD_CLOUD_INSTANCE_IP>
```

*(Default AMD Cloud username is `ubuntu` or `root` depending on image).*

---

### 2. Connect with Port Tunneling (Connects Kido Dev Backend directly to AMD Cloud)
To link your workspace backend directly to the AMD Cloud instance's **ROCm GPU Engine (11434)** and **Agent Server (8000)**:

```bash
ssh -L 8000:localhost:8000 -L 11434:localhost:11434 -i C:\Users\brown\.ssh\id_ed25519 ubuntu@<AMD_CLOUD_INSTANCE_IP>
```

---

### 3. Using the Kido Dev Helper Script
You can also run the quick connector script in the `backend/` folder:

```cmd
backend\connect_amd_gpu.bat <AMD_CLOUD_INSTANCE_IP> [ubuntu|root]
```

**Example:**
```cmd
backend\connect_amd_gpu.bat 203.0.113.50 ubuntu
```

---

## ⚙️ Setting Up AMD Cloud Instance Environment

Once connected inside your AMD Cloud instance, start ROCm Ollama or the FastAPI Agent backend:

```bash
# Start local AMD ROCm inference engine on AMD Cloud VM
ollama serve &

# Pull model on AMD Cloud
ollama pull llama3.1:8b
```
