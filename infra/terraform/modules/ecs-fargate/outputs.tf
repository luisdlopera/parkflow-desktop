output "alb_hostname" {
  description = "The DNS name of the Load Balancer"
  value       = aws_lb.main.dns_name
}

output "ecs_cluster_name" {
  description = "The name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "The name of the ECS service"
  value       = aws_ecs_service.main.name
}

output "ecs_tasks_security_group_id" {
  description = "The ID of the security group attached to the ECS tasks"
  value       = aws_security_group.ecs_tasks.id
}
