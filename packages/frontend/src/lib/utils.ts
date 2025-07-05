import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Type utilities
type Prettier<T> = { [K in keyof T]: T[K] } & {}

type WithRequired<T, K extends keyof T> = Prettier<Omit<T, K> & Required<Pick<T, K>>>

type WithOptional<T, K extends keyof T> = Prettier<Omit<T, K> & Partial<Pick<T, K>>>

type Nullable<T> = { [K in keyof T]: T[K] | null }

// String utilities
export function capitalize(str: string): string {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function truncate(str: string, length: number, ellipsis = '...'): string {
  if (str.length <= length) return str
  return str.slice(0, length) + ellipsis
}

// Object utilities
export function omit<T extends object, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Omit<T, K> {
  const result = { ...obj }
  for (const key of keys) {
    delete result[key]
  }
  return result
}

export function pick<T extends object, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key]
    }
  }
  return result
}

// Array utilities
export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array))
}

export function chunk<T>(array: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size))
  }
  return result
}

// Promise utilities
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (retries === 0) throw error
    await sleep(delay)
    return retry(fn, retries - 1, delay * 2)
  }
}

// DOM utilities
export function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

export function getScrollPosition(element?: HTMLElement): { x: number; y: number } {
  if (!isBrowser()) return { x: 0, y: 0 }
  
  const target = element || document.documentElement
  return {
    x: target.scrollLeft,
    y: target.scrollTop
  }
}

// Formatting
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export function formatNumber(num: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(num)
}

// Validation
export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function isUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

// Debugging
export function debug(...args: any[]): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args)
  }
}
