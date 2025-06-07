# Docker Setup for Ombudsman Reports App

This guide explains how to run the Ombudsman Reports Next.js application using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose (usually included with Docker Desktop)
- extract results.zip to public/results

## Quick Start

### Production Build

1. **Build and run the application:**
   ```bash
   cd ombudsman-reports-app
   docker-compose up --build
   ```

2. **Access the application:**
   Open your browser and navigate to `http://localhost:3000`

### Development Mode

1. **Run in development mode:**
   ```bash
   docker-compose --profile dev up ombudsman-reports-app-dev
   ```

2. **Access the development server:**
   Open your browser and navigate to `http://localhost:3001`

## Docker Commands

### Building the Docker Image

```bash
# Build the production image
docker build -t ombudsman-reports-app .

# Build with a specific tag
docker build -t ombudsman-reports-app:v1.0.0 .
```

### Running the Container

```bash
# Run the production container
docker run -p 3000:3000 ombudsman-reports-app

# Run with volume mounting for PDF files
docker run -p 3000:3000 -v ../results:/app/public/results:ro ombudsman-reports-app

# Run in detached mode
docker run -d -p 3000:3000 --name ombudsman-app ombudsman-reports-app
```

### Managing Containers

```bash
# Stop the container
docker stop ombudsman-app

# Remove the container
docker rm ombudsman-app

# View logs
docker logs ombudsman-app

# View running containers
docker ps
```

## Configuration

### Environment Variables

The following environment variables can be configured:

- `NODE_ENV`: Set to `production` or `development`
- `PORT`: Port number (default: 3000)
- `HOSTNAME`: Hostname to bind to (default: 0.0.0.0)

### Volume Mounting

The application expects PDF files to be available at `/app/public/results` inside the container. You have two options:

**Option 1: Volume mounting (recommended for development/dynamic content):**
```bash
# Mount the results directory from parent directory
-v ../results:/app/public/results:ro
```

**Option 2: Bake PDFs into the image (for static deployments):**
```dockerfile
# Uncomment and modify the COPY line in the pdfs stage
COPY ../results/ ./results/
```

The separate PDF layer allows you to:
- **Update PDFs independently** without rebuilding the app
- **Cache PDF data separately** from application code
- **Choose deployment strategy** (volume mount vs baked-in)

## Multi-Stage Build Details

The Dockerfile uses a multi-stage build approach with separated layers:

1. **deps**: Installs Node.js dependencies
2. **builder**: Builds the Next.js application
3. **pdfs**: Separate layer for PDF data management
4. **runner**: Creates the final production image combining app and PDF layers

This layered approach provides several benefits:
- **Smaller final image size** by excluding build dependencies and source code
- **Separated concerns** - PDF data is independent of application code
- **Flexible PDF management** - PDFs can be baked into image or mounted as volumes
- **Better caching** - Changes to PDFs don't invalidate app layers and vice versa

## Health Checks

The Docker Compose configuration includes health checks that:
- Test the application endpoint every 30 seconds
- Allow 40 seconds for initial startup
- Retry up to 3 times before marking as unhealthy

## Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   # Check what's using port 3000
   lsof -i :3000
   
   # Use a different port
   docker run -p 3001:3000 ombudsman-reports-app
   ```

2. **Permission issues with mounted volumes:**
   ```bash
   # Ensure the results directory has proper permissions
   chmod -R 755 ../results
   ```

3. **Build failures:**
   ```bash
   # Clean Docker cache and rebuild
   docker system prune -a
   docker-compose build --no-cache
   ```

### Viewing Logs

```bash
# View container logs
docker-compose logs ombudsman-reports-app

# Follow logs in real-time
docker-compose logs -f ombudsman-reports-app
```
## Package Manager

This Docker setup is optimized for **Yarn** as the primary package manager:
- Uses `yarn.lock` for dependency resolution
- Falls back to npm if `package-lock.json` is present
- Development container uses `yarn dev` command
- Build process prioritizes Yarn over other package managers

The Dockerfile automatically detects and uses the appropriate package manager based on lockfiles present, with Yarn being the preferred choice.

## Production Deployment

For production deployment, consider:

1. **Using a reverse proxy** (nginx, Apache) for SSL termination
2. **Setting up proper logging** and monitoring
3. **Configuring resource limits** in docker-compose.yml
4. **Using Docker secrets** for sensitive configuration
5. **Setting up automated backups** for data volumes

### Example Production Configuration

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  ombudsman-reports-app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - /var/ombudsman/results:/app/public/results:ro
    restart: always
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

## Development Workflow

1. **Make changes** to your source code
2. **Rebuild the image** if needed:
   ```bash
   docker-compose build
   ```
3. **Restart the container**:
   ```bash
   docker-compose restart
   ```

For faster development, use the development profile which mounts your source code as a volume.