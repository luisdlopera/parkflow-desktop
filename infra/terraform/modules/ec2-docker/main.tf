# Security Group for the EC2 Instance
resource "aws_security_group" "ec2_docker" {
  name        = "${var.project_name}-${var.environment}-ec2-docker-sg"
  description = "Security group for EC2 running Docker Compose"
  vpc_id      = var.vpc_id

  # SSH access (Restrict this to your IP in production!)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.admin_cidr_blocks 
  }

  # HTTP access for the API/Web
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS access
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Custom ports mapped in your docker-compose
  ingress {
    from_port   = 6021 # Postgres
    to_port     = 6021
    protocol    = "tcp"
    cidr_blocks = var.admin_cidr_blocks
  }

  ingress {
    from_port   = 8080 # Spring Boot default
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = var.admin_cidr_blocks
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-ec2-sg"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Find the latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"] # Use arm64 if using t4g instances
  }
}

# Elastic IP for stable addressing
resource "aws_eip" "ec2" {
  domain = "vpc"

  tags = {
    Name        = "${var.project_name}-${var.environment}-ec2-eip"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_eip_association" "eip_assoc" {
  instance_id   = aws_instance.docker_host.id
  allocation_id = aws_eip.ec2.id
}

# The EC2 Instance
resource "aws_instance" "docker_host" {
  ami                    = data.aws_ami.amazon_linux_2023.id
  instance_type          = var.instance_type
  subnet_id              = var.public_subnet_id
  vpc_security_group_ids = [aws_security_group.ec2_docker.id]
  key_name               = var.key_name != "" ? var.key_name : null

  # Script that runs on first boot
  user_data = <<-EOF
              #!/bin/bash
              # Update OS
              dnf update -y
              
              # Install Docker
              dnf install -y docker
              systemctl enable docker
              systemctl start docker
              
              # Add ec2-user to docker group
              usermod -a -G docker ec2-user
              
              # Install Docker Compose
              curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
              chmod +x /usr/local/bin/docker-compose
              
              # Create a directory for the app
              mkdir -p /home/ec2-user/parkflow
              chown ec2-user:ec2-user /home/ec2-user/parkflow
              
              echo "Docker and Docker Compose installed successfully."
              EOF

  tags = {
    Name        = "${var.project_name}-${var.environment}-docker-host"
    Environment = var.environment
    Project     = var.project_name
  }
}
