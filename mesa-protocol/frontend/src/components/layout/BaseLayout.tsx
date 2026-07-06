import type { FC, PropsWithChildren } from 'react'
import { Navbar } from './Navbar'
import 'twin.macro'

export const BaseLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <>
      <div tw="relative flex min-h-screen flex-col bg-[#050508] text-white">
        <Navbar />
        <main tw="relative flex grow flex-col">{children}</main>
      </div>
    </>
  )
}

