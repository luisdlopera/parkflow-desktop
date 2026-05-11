import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  ClientValidationError,
  toUserMessageFromClientValidation,
  validatePayloadOrThrow
} from '@/lib/validation/request-guard'

describe('request guard', () => {
  it('returns parsed data when payload is valid', () => {
    const schema = z.object({ name: z.string(), age: z.number().int() })

    expect(validatePayloadOrThrow(schema, { name: 'Ana', age: 31 })).toEqual({ name: 'Ana', age: 31 })
  })

  it('collects field errors for invalid payloads', () => {
    const schema = z.object({
      name: z.string().min(3),
      nested: z.object({ code: z.number().int() })
    })

    expect(() => validatePayloadOrThrow(schema, { name: 'Al', nested: { code: 1.5 } })).toThrow(
      ClientValidationError
    )

    try {
      validatePayloadOrThrow(schema, { name: 'Al', nested: { code: 1.5 } })
    } catch (error) {
      expect(error).toBeInstanceOf(ClientValidationError)
      const validationError = error as ClientValidationError
      expect(validationError.fieldErrors.name).toBeTruthy()
      expect(validationError.fieldErrors['nested.code']).toBeTruthy()
      expect(toUserMessageFromClientValidation(validationError)).toMatch(/^name: /)
    }
  })
})
