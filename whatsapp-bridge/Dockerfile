FROM golang:1.26-alpine AS builder

WORKDIR /app
RUN apk add --no-cache ca-certificates
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/whatsapp-bridge .

FROM alpine:3.20

WORKDIR /app
RUN apk add --no-cache ca-certificates
COPY --from=builder /out/whatsapp-bridge /usr/local/bin/whatsapp-bridge

ENV WHATSAPP_BRIDGE_ADDR=:8091
EXPOSE 8091

CMD ["whatsapp-bridge"]
