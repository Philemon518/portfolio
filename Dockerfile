FROM node:22-alpine AS builder
RUN apk add --no-cache git git-lfs
WORKDIR /app

# Railway Docker builds receive LFS pointer stubs in COPY context, not real GLB blobs.
# Clone the repo with Git LFS during the build instead.
ARG RAILWAY_GIT_COMMIT_SHA
ARG RAILWAY_GIT_REPO_OWNER=Philemon518
ARG RAILWAY_GIT_REPO_NAME=portfolio
ARG RAILWAY_GIT_BRANCH=main

RUN git lfs install && \
    git clone --branch "${RAILWAY_GIT_BRANCH}" \
      "https://github.com/${RAILWAY_GIT_REPO_OWNER}/${RAILWAY_GIT_REPO_NAME}.git" . && \
    if [ -n "${RAILWAY_GIT_COMMIT_SHA}" ]; then git checkout "${RAILWAY_GIT_COMMIT_SHA}"; fi && \
    git lfs pull

RUN npm ci
RUN npm run build

FROM nginx:1.27-alpine AS runner
ENV PORT=8080
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 8080
