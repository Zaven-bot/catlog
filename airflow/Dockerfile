# Custom Airflow image with CatLog ETL dependencies
FROM apache/airflow:2.7.2-python3.11

# Switch to root user to install system dependencies
USER root

# Install system dependencies if needed
RUN apt-get update && apt-get install -y \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Switch back to airflow user
USER airflow

# Install Python dependencies for CatLog ETL
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Copy ETL modules (done via volume mount in docker-compose)
# This ensures the latest ETL code is always available