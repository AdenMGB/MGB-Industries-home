export interface User {
  id: string
  email: string
  name: string
  role: 'user' | 'admin'
  created_at: string
  updated_at: string
}

export interface UserWithoutPassword extends Omit<User, 'password_hash'> {}

export interface JWTPayload {
  userId: string
  email: string
  role: 'user' | 'admin'
}
