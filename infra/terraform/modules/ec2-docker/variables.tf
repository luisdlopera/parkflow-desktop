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

variable "public_subnet_id" {
  description = "Public subnet ID where the EC2 instance will reside"
  type        = string
}

variable "instance_type" {
  description = "EC2 Instance type (e.g. t4g.small for ARM, t3.micro for x86)"
  type        = string
  default     = "t3.micro"
}

variable "key_name" {
  description = "Name of the SSH key pair to access the instance"
  type        = string
  default     = ""
}

variable "admin_cidr_blocks" {
  description = "CIDR blocks allowed to access admin ports (SSH, Postgres, Spring Boot)"
  type        = list(string)
  default     = ["0.0.0.0/0"] # TODO: Restrict this in production
}
