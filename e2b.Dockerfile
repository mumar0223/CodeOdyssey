# Base E2B sandbox
FROM e2bdev/code-interpreter:latest

USER root

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    default-jdk \
    gcc \
    g++ \
    build-essential \
    curl \
    git \
    wget \
    unzip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js (for JS execution)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN python3 -m pip install --no-cache-dir --upgrade pip --break-system-packages

# Install common scientific libraries (lightweight learning stack)
RUN pip install --no-cache-dir --break-system-packages \
    numpy \
    pandas \
    matplotlib \
    scikit-learn \
    opencv-python-headless

# Install PyTorch CPU version (NO CUDA)
RUN pip install --no-cache-dir --break-system-packages \
    torch \
    torchvision \
    torchaudio \
    --index-url https://download.pytorch.org/whl/cpu

# Install TensorFlow CPU version
RUN pip install --no-cache-dir --break-system-packages tensorflow-cpu

# Switch back to sandbox user
USER user