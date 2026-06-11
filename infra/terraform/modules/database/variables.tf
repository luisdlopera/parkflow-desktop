variable "environment" {
  type = string
}

variable "project_name" {
  type = string
}

variable "vpc_id" {
  description = "VPC ID where the DB will be deployed"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for the DB subnet group"
  type        = list(string)
}

variable "db_name" {
  description = "Name of the database"
  type        = string
  default     = "parkflow"
}

variable "db_username" {
  description = "Master username for the DB"
  type        = string
  default     = "parkflow_admin"
}

variable "db_password" {
  description = "Master password for the DB (Should be passed via secrets)"
  type        = string
  sensitive   = true
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro" # Graviton2 instance, cost-effective
}

variable "allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}
