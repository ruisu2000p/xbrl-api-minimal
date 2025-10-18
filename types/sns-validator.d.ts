declare module 'sns-validator' {
  export default class SnsValidator {
    validate(message: any, callback: (err: Error | null) => void): void
  }
}
