import { useRef } from "react"

export const useNullRef = <T,>() => useRef<T>(null)