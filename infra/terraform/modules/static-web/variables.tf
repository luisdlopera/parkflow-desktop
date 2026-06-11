variable "environment" {
  type = string
}

variable "project_name" {
  type = string
}

variable "domain_name" {
  description = "The domain name for the website (e.g. app.parkflow.com)"
  type        = string
  default     = ""
}
