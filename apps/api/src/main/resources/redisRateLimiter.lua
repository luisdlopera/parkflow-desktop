local key = KEYS[1]
local maxTokens = tonumber(ARGV[1])
local windowSeconds = tonumber(ARGV[2])

local current = redis.call("INCR", key)
if current == 1 then
  redis.call("EXPIRE", key, windowSeconds)
end

if current <= maxTokens then
  return 1
else
  return 0
end
