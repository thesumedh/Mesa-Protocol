import Head from 'next/head'
import { LandingPage } from '@/components/landing/LandingPage'

export default function WelcomePage() {
  return (
    <>
      <Head>
        <title>Mesa Protocol | Decentralized ROSCA & Chamas on Stellar</title>
        <meta
          name="description"
          content="Rotating Savings Circles (ROSCA/Chamas) powered by Soroban smart contracts on Stellar."
        />
      </Head>
      <LandingPage />
    </>
  )
}
