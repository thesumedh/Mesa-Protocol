import { BaseLayout } from '@/components/layout/BaseLayout'
import { HotToastConfig } from '@/components/layout/HotToastConfig'
import GlobalStyles from '@/styles/GlobalStyles'
import { ChakraProvider, DarkMode } from '@chakra-ui/react'
import { cache } from '@emotion/css'
import { CacheProvider } from '@emotion/react'
import { DefaultSeo } from 'next-seo'
import type { AppProps } from 'next/app'
import Head from 'next/head'

import MySorobanReactProvider from '../components/web3/MySorobanReactProvider'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <DefaultSeo
        defaultTitle="Mesa Protocol"
        titleTemplate="%s | Mesa Protocol"
        description="Web3 rotating savings circles and Chamas powered by Soroban smart contracts on Stellar."
        openGraph={{
          type: 'website',
          locale: 'en',
          // url: env.url,
          site_name: 'Mesa Protocol',
          images: [
            // {
            //   url: `${env.url}/images/cover.jpg`, // TODO
            //   width: 1200,
            //   height: 675,
            // },
          ],
        }}
        twitter={{
          handle: '@MesaProtocol',
        }}
      />

      <Head>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />

        {/* Set Font Variables */}
        <style>{`
          :root {
            --font-inconsolata: 'Inconsolata', 'Public Sans', system-ui, sans-serif;
          }
        `}</style>
      </Head>

      <MySorobanReactProvider>
        <CacheProvider value={cache}>
          <ChakraProvider>
            <DarkMode>
              <GlobalStyles />

              <BaseLayout>
                <Component {...pageProps} />
              </BaseLayout>

              <HotToastConfig />
            </DarkMode>
          </ChakraProvider>
        </CacheProvider>
      </MySorobanReactProvider>
    </>
  )
}

export default MyApp
