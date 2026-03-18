# Stage 1: Build frontend
FROM node:20-alpine AS frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Build Rust binary
FROM rust:1.86-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y \
    git \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace manifests first for better layer caching
COPY Cargo.toml Cargo.lock rust-toolchain.toml ./
COPY crates/mpc-server/Cargo.toml crates/mpc-server/Cargo.toml
COPY crates/threshold-signatures/Cargo.toml crates/threshold-signatures/Cargo.toml

# Copy all other workspace member Cargo.toml files (needed for workspace resolution)
COPY crates/ crates/

# Build only the mpc-server binary
RUN cargo build -p mpc-server --release

# Stage 3: Minimal runtime image
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/mpc-server ./mpc-server
COPY --from=frontend /app/dist ./static

ENV STATIC_DIR=/app/static

EXPOSE 3000
CMD ["./mpc-server"]
