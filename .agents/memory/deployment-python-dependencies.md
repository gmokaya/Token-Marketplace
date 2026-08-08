---
name: Deployment Python dependency isolation
description: Root pyproject dependencies are installed during deployment even when the deployed app is Node/PNPM.
---

In this workspace, deployment automatically runs `uv lock` and `uv sync` at the repository root. Unused Python dependencies can therefore break a Node deployment; keep the root Python project dependency-free unless Python is part of the deployed runtime.

**Why:** A Node API deployment failed while building Pillow, pulled in transitively by unused ReportLab/PyMuPDF dependencies.

**How to apply:** When deployment fails in `uv sync`, inspect the root `pyproject.toml` before changing application code. Remove or isolate Python-only tooling, regenerate `uv.lock`, and verify `uv sync` plus the artifact’s production build.