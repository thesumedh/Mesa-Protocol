import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  SimpleGrid,
  Icon,
  Flex,
} from '@chakra-ui/react';
import { FiArrowRight, FiShield, FiTrendingUp, FiLayers, FiGlobe } from 'react-icons/fi';
import 'twin.macro';

export default function WelcomePage() {
  return (
    <>
      <Head>
        <title>Mesa Protocol | Decentrallized ROSCA & Chamas on Stellar</title>
        <meta
          name="description"
          content="Stitch-free Rotating Savings Circles (ROSCA/Chamas) powered by Soroban smart contracts on Stellar."
        />
      </Head>

      <Box
        bgGradient="linear(to-b, #07060e, #0c0a15)"
        minH="92vh"
        color="white"
        display="flex"
        alignItems="center"
        position="relative"
        overflow="hidden"
      >
        {/* Glow effect spheres */}
        <Box
          position="absolute"
          top="-10%"
          left="5%"
          w="400px"
          h="400px"
          bg="rgba(128, 90, 213, 0.15)"
          borderRadius="full"
          filter="blur(120px)"
        />
        <Box
          position="absolute"
          bottom="-10%"
          right="5%"
          w="400px"
          h="400px"
          bg="rgba(0, 180, 216, 0.15)"
          borderRadius="full"
          filter="blur(120px)"
        />

        <Container maxW="container.xl" py={20} position="relative" zIndex={1}>
          <Flex direction="column" align="center" textAlign="center" mb={16}>
            <Badge
              px={3}
              py={1}
              mb={4}
              borderRadius="full"
              colorScheme="purple"
              fontSize="2xs"
              fontWeight="bold"
              letterSpacing="widest"
              textTransform="uppercase"
            >
              Next-Gen Rotating Savings
            </Badge>

            <Heading
              as="h1"
              fontSize={{ base: '4xl', md: '6xl' }}
              fontWeight="extrabold"
              bgGradient="linear(to-r, cyan.400, purple.500, pink.500)"
              bgClip="text"
              mb={6}
              letterSpacing="tight"
              lineHeight="shorter"
            >
              Decentralized Chamas on Stellar
            </Heading>

            <Text
              fontSize={{ base: 'md', md: 'xl' }}
              color="whiteAlpha.700"
              maxW="2xl"
              mb={10}
              lineHeight="tall"
            >
              Mesa Protocol stitches Rotating Savings and Credit Associations (ROSCAs) with Soroban smart contracts,
              delivering automatic payouts, default protection, and borderless path payments.
            </Text>

            <HStack spacing={4}>
              <Link href="/discover" passHref legacyBehavior>
                <Button
                  size="lg"
                  colorScheme="purple"
                  px={8}
                  py={7}
                  borderRadius="2xl"
                  rightIcon={<FiArrowRight />}
                  boxShadow="0 0 25px rgba(128, 90, 213, 0.5)"
                  _hover={{
                    transform: 'translateY(-2px)',
                    boxShadow: '0 0 35px rgba(128, 90, 213, 0.7)',
                  }}
                  transition="all 0.2s"
                >
                  Launch App
                </Button>
              </Link>
            </HStack>
          </Flex>

          {/* Features Grid */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={8} mt={10}>
            
            <VStack
              p={6}
              bg="rgba(255, 255, 255, 0.02)"
              border="1px solid rgba(255,255,255,0.05)"
              borderRadius="2xl"
              align="start"
              spacing={4}
              _hover={{ borderColor: 'purple.500', transform: 'translateY(-2px)' }}
              transition="all 0.2s"
            >
              <Flex
                p={3}
                bg="rgba(128, 90, 213, 0.1)"
                borderRadius="xl"
                color="purple.400"
              >
                <Icon as={FiLayers} size={24} />
              </Flex>
              <Heading size="sm" color="white">
                Rotating Pot Payouts
              </Heading>
              <Text fontSize="xs" color="whiteAlpha.600" lineHeight="relaxed">
                Smart contracts automatically handle saving rounds and route the gathered funds to the next round winner in the queue.
              </Text>
            </VStack>

            <VStack
              p={6}
              bg="rgba(255, 255, 255, 0.02)"
              border="1px solid rgba(255,255,255,0.05)"
              borderRadius="2xl"
              align="start"
              spacing={4}
              _hover={{ borderColor: 'purple.500', transform: 'translateY(-2px)' }}
              transition="all 0.2s"
            >
              <Flex
                p={3}
                bg="rgba(0, 180, 216, 0.1)"
                borderRadius="xl"
                color="cyan.400"
              >
                <Icon as={FiShield} size={24} />
              </Flex>
              <Heading size="sm" color="white">
                2x Collateral Security
              </Heading>
              <Text fontSize="xs" color="whiteAlpha.600" lineHeight="relaxed">
                Protects circles against late or missing payments. Delinquent members are automatically ejected, forfeiting their deposits.
              </Text>
            </VStack>

            <VStack
              p={6}
              bg="rgba(255, 255, 255, 0.02)"
              border="1px solid rgba(255,255,255,0.05)"
              borderRadius="2xl"
              align="start"
              spacing={4}
              _hover={{ borderColor: 'purple.500', transform: 'translateY(-2px)' }}
              transition="all 0.2s"
            >
              <Flex
                p={3}
                bg="rgba(236, 72, 153, 0.1)"
                borderRadius="xl"
                color="pink.400"
              >
                <Icon as={FiGlobe} size={24} />
              </Flex>
              <Heading size="sm" color="white">
                Path-Payment Swaps
              </Heading>
              <Text fontSize="xs" color="whiteAlpha.600" lineHeight="relaxed">
                Participate globally. Pay using KES, EURC, or XLM; Horizon path payments swap assets directly on-chain to the circle's base USDC.
              </Text>
            </VStack>

            <VStack
              p={6}
              bg="rgba(255, 255, 255, 0.02)"
              border="1px solid rgba(255,255,255,0.05)"
              borderRadius="2xl"
              align="start"
              spacing={4}
              _hover={{ borderColor: 'purple.500', transform: 'translateY(-2px)' }}
              transition="all 0.2s"
            >
              <Flex
                p={3}
                bg="rgba(72, 187, 120, 0.1)"
                borderRadius="xl"
                color="green.400"
              >
                <Icon as={FiTrendingUp} size={24} />
              </Flex>
              <Heading size="sm" color="white">
                Emergency Safeguards
              </Heading>
              <Text fontSize="xs" color="whiteAlpha.600" lineHeight="relaxed">
                In case of systemic defaults, members can halt the group contract and retrieve their accumulated principal and deposit.
              </Text>
            </VStack>

          </SimpleGrid>
        </Container>
      </Box>
    </>
  );
}

import { Badge } from '@chakra-ui/react';
