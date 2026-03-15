import "dotenv/config";
import { Template, defaultBuildLogger } from "e2b";

export const template = Template()
  .fromBaseImage()

  // System dependencies
  .aptInstall([
    "default-jdk",
    "gcc",
    "g++",
    "build-essential",
    "python3",
    "python3-pip",
    "python3-venv",
    "curl",
    "git",
    "wget",
    "unzip",
  ])

  // Learning libraries (Lightweight stack)
  .pipInstall([
    "numpy",
    "pandas",
    "matplotlib",
    "scikit-learn",
    "opencv-python-headless",
    "tensorflow-cpu",
  ])

  // SPECIFIC FIX: Use .runCmd() to pass the specific CPU-only index URL for PyTorch
  .runCmd(
    "pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu",
  );

async function main() {
  console.log("🚀 Starting E2B template build...");
  console.log("Installing compilers + ML libraries (CPU versions)");

  const templateId = "code-odyssey-env";

  await Template.build(template, templateId, {
    cpuCount: 2,
    memoryMB: 2048,
    onBuildLogs: defaultBuildLogger(),
  });

  console.log("\n🎉 Template build complete!");
  console.log(`Template ID: ${templateId}`);
}

main().catch(console.error);
