FROM node:22-alpine AS builder
RUN apk add --no-cache git git-lfs
WORKDIR /app

ARG GITHUB_TOKEN
ARG RAILWAY_GIT_COMMIT_SHA
ARG RAILWAY_GIT_REPO_OWNER=Philemon518
ARG RAILWAY_GIT_REPO_NAME=portfolio
ARG RAILWAY_GIT_BRANCH=main

COPY . .

# Railway's Docker context includes LFS pointer stubs, not real GLB blobs.
# Hydrate models by cloning with a GitHub PAT, then copy only public/models/.
RUN git lfs install && \
    if head -c 40 public/models/honda_cr-v.glb 2>/dev/null | grep -q 'git-lfs'; then \
      if [ -z "${GITHUB_TOKEN}" ]; then \
        echo 'GLB models are Git LFS pointers. Add GITHUB_TOKEN to Railway variables (GitHub PAT with repo scope), then redeploy.' && \
        exit 1; \
      fi && \
      rm -rf /tmp/portfolio-lfs && \
      git clone --branch "${RAILWAY_GIT_BRANCH}" \
        "https://x-access-token:${GITHUB_TOKEN}@github.com/${RAILWAY_GIT_REPO_OWNER}/${RAILWAY_GIT_REPO_NAME}.git" \
        /tmp/portfolio-lfs && \
      cd /tmp/portfolio-lfs && \
      if [ -n "${RAILWAY_GIT_COMMIT_SHA}" ]; then git checkout "${RAILWAY_GIT_COMMIT_SHA}"; fi && \
      git lfs pull && \
      cp -a public/models/. /app/public/models/ && \
      rm -rf /tmp/portfolio-lfs; \
    fi

RUN npm ci
RUN npm run build

FROM nginx:1.27-alpine AS runner
ENV PORT=8080
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 8080
