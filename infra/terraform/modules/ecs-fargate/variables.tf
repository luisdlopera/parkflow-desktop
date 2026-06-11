variable "environment" {
  type = string
}

variable "project_name" {
  type = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs (for the Load Balancer)"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "Private subnet IDs (for the Fargate tasks)"
  type        = list(string)
}

variable "app_port" {
  description = "Port the container exposes"
  type        = number
  default     = 8080
}

variable "container_image" {
  description = "Docker image URL to run"
  type        = string
  default     = "nginx:latest" # Default placeholder
}

variable "db_host" {
  description = "Database Host URL"
  type        = string
}

variable "db_name" {
  description = "Database Name"
  type        = string
}

variable "db_user" {
  description = "Database Username"
  type        = string
}

variable "db_password_arn" {
  description = "ARN of the AWS Secrets Manager secret or SSM Parameter containing the DB password"
  type        = string
}
