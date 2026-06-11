output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.docker_host.id
}

output "public_ip" {
  description = "Elastic IP of the EC2 instance"
  value       = aws_eip.ec2.public_ip
}

output "ssh_connection_string" {
  description = "Command to connect via SSH"
  value       = "ssh -i <your-key.pem> ec2-user@${aws_eip.ec2.public_ip}"
}
