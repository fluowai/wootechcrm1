FROM ubuntu:24.04 AS playwright-deps
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/browsers
ARG TARGETARCH

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl wget git \
  && if [ "$TARGETARCH" = "arm64" ]; then GO_ARCH="arm64"; else GO_ARCH="amd64"; fi \
  && wget -q "https://go.dev/dl/go1.26.3.linux-${GO_ARCH}.tar.gz" \
  && tar -C /usr/local -xzf "go1.26.3.linux-${GO_ARCH}.tar.gz" \
  && rm "go1.26.3.linux-${GO_ARCH}.tar.gz" \
  && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/* \
  && /usr/local/go/bin/go install github.com/mxschmitt/playwright-go/cmd/playwright@latest \
  && mkdir -p /opt/browsers \
  && /root/go/bin/playwright install chromium --with-deps

FROM golang:1.26.3-trixie AS builder
WORKDIR /src
RUN git clone https://github.com/gosom/google-maps-scraper.git . \
  && git checkout 22c7ee571bfe01a69b126e8206704ff474553807
COPY rank.patch /tmp/rank.patch
RUN git apply /tmp/rank.patch \
  && go mod download \
  && CGO_ENABLED=0 go build -ldflags="-w -s" -o /usr/bin/google-maps-scraper .

FROM debian:trixie-slim
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/browsers
ENV PLAYWRIGHT_DRIVER_PATH=/opt

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libdbus-1-3 libxkbcommon0 libatspi2.0-0 libx11-6 libxcomposite1 libxdamage1 libxext6 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2t64 \
  && rm -rf /var/lib/apt/lists/*

COPY --from=playwright-deps /opt/browsers /opt/browsers
COPY --from=playwright-deps /root/.cache/ms-playwright-go /opt/ms-playwright-go
COPY --from=builder /usr/bin/google-maps-scraper /usr/bin/google-maps-scraper

RUN chmod 755 /usr/bin/google-maps-scraper
ENTRYPOINT ["google-maps-scraper"]
