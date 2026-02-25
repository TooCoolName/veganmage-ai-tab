import { useRef } from "react"

export const useNullRef = <T,>() => useRef<T>(null)

export const isNotNull = <T>(item: T): boolean => item !== null