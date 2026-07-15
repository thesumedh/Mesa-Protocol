import Link from 'next/link'
import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  Icon,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react'
import { FiArrowRight, FiGlobe, FiLayers, FiShield, FiTrendingUp } from 'react-icons/fi'

const features = [
  {
    title: 'Rotating Pot Payouts',
    description:
      'Soroban contracts track each saving round and route the pooled contribution to the next member in the rotation.',
    icon: FiLayers,
    color: 'purple.400',
    bg: 'rgba(128, 90, 213, 0.1)',
  },
  {
    title: '2x Collateral Security',
    description:
      'Members enter with a security deposit so circles have automated protection against missed or late payments.',
    icon: FiShield,
    color: 'cyan.400',
    bg: 'rgba(0, 180, 216, 0.1)',
  },
  {
    title: 'Path-Payment Swaps',
    description:
      'Join globally with XLM, EURC, KES, or USDC while Stellar path payments convert into the circle asset.',
    icon: FiGlobe,
    color: 'pink.400',
    bg: 'rgba(236, 72, 153, 0.1)',
  },
  {
    title: 'Emergency Safeguards',
    description:
      'If defaults compound, members can flag emergency mode and withdraw their unlocked principal.',
    icon: FiTrendingUp,
    color: 'green.400',
    bg: 'rgba(72, 187, 120, 0.1)',
  },
]

export const LandingPage = () => (
  <Box
    bgGradient="linear(to-b, #07060e, #0c0a15)"
    minH="92vh"
    color="white"
    display="flex"
    alignItems="center"
    position="relative"
    overflow="hidden"
  >
    <Box position="absolute" top="-10%" left="5%" w="400px" h="400px" bg="rgba(128, 90, 213, 0.15)" borderRadius="full" filter="blur(120px)" />
    <Box position="absolute" bottom="-10%" right="5%" w="400px" h="400px" bg="rgba(0, 180, 216, 0.15)" borderRadius="full" filter="blur(120px)" />

    <Container maxW="container.xl" py={20} position="relative" zIndex={1}>
      <Flex direction="column" align="center" textAlign="center" mb={16}>
        <Badge px={3} py={1} mb={4} borderRadius="full" colorScheme="purple" fontSize="2xs" fontWeight="bold" letterSpacing="widest" textTransform="uppercase">
          Web3 Chamas on Stellar
        </Badge>

        <Heading as="h1" fontSize={{ base: '4xl', md: '6xl' }} fontWeight="extrabold" bgGradient="linear(to-r, cyan.400, purple.500, pink.500)" bgClip="text" mb={6} letterSpacing="tight" lineHeight="shorter">
          Decentralized Chamas on Stellar
        </Heading>

        <Text fontSize={{ base: 'md', md: 'xl' }} color="whiteAlpha.700" maxW="2xl" mb={10} lineHeight="tall">
          Mesa Protocol brings Rotating Savings and Credit Associations to Stellar with Soroban smart contracts,
          automatic payouts, default protection, and borderless wallet onboarding.
        </Text>

        <HStack spacing={4} flexWrap="wrap" justify="center">
          <Link href="/discover" passHref legacyBehavior>
            <Button as="a" size="lg" colorScheme="purple" px={8} py={7} borderRadius="2xl" rightIcon={<FiArrowRight />} boxShadow="0 0 25px rgba(128, 90, 213, 0.5)" _hover={{ transform: 'translateY(-2px)', boxShadow: '0 0 35px rgba(128, 90, 213, 0.7)' }} transition="all 0.2s">
              Launch App
            </Button>
          </Link>
          <Link href="/my-chamas" passHref legacyBehavior>
            <Button as="a" size="lg" variant="outline" borderRadius="2xl" px={8} py={7} colorScheme="whiteAlpha">
              View My Circles
            </Button>
          </Link>
        </HStack>
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={8} mt={10}>
        {features.map((feature) => (
          <VStack key={feature.title} p={6} bg="rgba(255, 255, 255, 0.02)" border="1px solid rgba(255,255,255,0.05)" borderRadius="2xl" align="start" spacing={4} _hover={{ borderColor: 'purple.500', transform: 'translateY(-2px)' }} transition="all 0.2s">
            <Flex p={3} bg={feature.bg} borderRadius="xl" color={feature.color}>
              <Icon as={feature.icon} boxSize={6} />
            </Flex>
            <Heading size="sm" color="white">{feature.title}</Heading>
            <Text fontSize="xs" color="whiteAlpha.600" lineHeight="relaxed">{feature.description}</Text>
          </VStack>
        ))}
      </SimpleGrid>
    </Container>
  </Box>
)
