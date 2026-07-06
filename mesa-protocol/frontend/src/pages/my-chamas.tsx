import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  VStack,
  HStack,
  Badge,
  Button,
  Icon,
  Flex,
} from '@chakra-ui/react';
import { useSorobanReact } from '@soroban-react/core';
import { useMesaCore, Chama } from '../hooks/useMesaCore';
import { SUPPORTED_ASSETS } from '../utils/config';
import { FiClock, FiUsers, FiDollarSign, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import 'twin.macro';

export default function MyChamasPage() {
  const sorobanContext = useSorobanReact();
  const { address } = sorobanContext;
  const { getChamas } = useMesaCore();
  const [chamas, setChamas] = useState<Chama[]>([]);

  useEffect(() => {
    setChamas(getChamas());
  }, [getChamas]);

  const userAddr = address || 'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TUSDC';

  // Filter chamas based on status
  const joinedChamas = chamas.filter(c => c.members.includes(userAddr) || (c.missedPayments[userAddr] !== undefined));

  const activeChamas = joinedChamas.filter(
    c => c.members.includes(userAddr) && c.currentRound < c.members.length && !c.emergencyMode
  );

  const completedChamas = joinedChamas.filter(
    c => c.members.includes(userAddr) && (c.currentRound >= c.members.length || c.emergencyMode)
  );

  const ejectedChamas = joinedChamas.filter(
    c => !c.members.includes(userAddr) || (c.missedPayments[userAddr] >= 2)
  );

  const renderChamaGrid = (list: Chama[], type: 'active' | 'completed' | 'ejected') => {
    if (list.length === 0) {
      return (
        <Flex
          direction="column"
          align="center"
          justify="center"
          py={16}
          bg="rgba(255,255,255,0.02)"
          borderRadius="2xl"
          border="1px dashed rgba(255, 255, 255, 0.1)"
        >
          <Text color="whiteAlpha.500" fontSize="md">
            No savings circles found in this category.
          </Text>
        </Flex>
      );
    }

    return (
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
        {list.map((chama) => {
          const assetMeta = SUPPORTED_ASSETS[chama.tokenCode];
          const nextPayoutIndex = chama.currentRound % chama.rotationOrder.length;
          const isWinnerThisRound = chama.rotationOrder[nextPayoutIndex] === userAddr;

          return (
            <Box
              key={chama.id}
              p={6}
              borderRadius="2xl"
              bg="rgba(255, 255, 255, 0.02)"
              border="1px solid rgba(255, 255, 255, 0.05)"
              _hover={{
                borderColor: 'purple.500',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              }}
              transition="all 0.2s"
            >
              <Flex justify="space-between" align="start" mb={4}>
                <Badge colorScheme="purple" p={1.5} borderRadius="md">
                  {assetMeta?.icon} {chama.tokenCode}
                </Badge>
                {type === 'active' && isWinnerThisRound && (
                  <Badge colorScheme="green" variant="solid" borderRadius="full" px={2}>
                    Payout Next!
                  </Badge>
                )}
                {type === 'completed' && (
                  <Badge colorScheme="teal" variant="outline" borderRadius="full">
                    Completed
                  </Badge>
                )}
                {type === 'ejected' && (
                  <Badge colorScheme="red" variant="solid" borderRadius="full">
                    Ejected / Defaulted
                  </Badge>
                )}
              </Flex>

              <Heading size="md" color="white" mb={3} noOfLines={1}>
                {chama.name}
              </Heading>

              <VStack align="start" spacing={3} mb={6} fontSize="sm" color="whiteAlpha.700">
                <HStack>
                  <Icon as={FiDollarSign} color="purple.400" />
                  <Text>
                    Your Contribution: <strong tw="text-white">{chama.contributionAmount} {chama.tokenCode}</strong>
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FiClock} color="purple.400" />
                  <Text>
                    Active Round: <strong tw="text-white">{chama.currentRound + 1} / {chama.members.length}</strong>
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={FiUsers} color="purple.400" />
                  <Text>
                    Circle Members: <strong tw="text-white">{chama.members.length}</strong>
                  </Text>
                </HStack>
              </VStack>

              <Link href={`/chama/${chama.id}`} passHref legacyBehavior>
                <Button w="full" colorScheme={type === 'ejected' ? 'red' : 'purple'} borderRadius="xl">
                  {type === 'ejected' ? 'View Details & Withdraw' : 'Open Dashboard'}
                </Button>
              </Link>
            </Box>
          );
        })}
      </SimpleGrid>
    );
  };

  return (
    <>
      <Head>
        <title>My Savings Circles | Mesa Protocol</title>
      </Head>

      <Box py={8} bgGradient="linear(to-b, #050508, #0c0a15)" minH="90vh">
        <Container maxW="container.xl">
          <VStack align="start" spacing={2} mb={10}>
            <Heading fontSize="3xl" fontWeight="extrabold" color="white">
              My Savings Circles
            </Heading>
            <Text color="whiteAlpha.700">
              Manage the rotating savings circles you are currently participating in, view completed payouts, and monitor default status.
            </Text>
          </VStack>

          <Tabs variant="soft-rounded" colorScheme="purple">
            <TabList
              bg="rgba(255,255,255,0.02)"
              p={1.5}
              borderRadius="2xl"
              border="1px solid rgba(255,255,255,0.05)"
              mb={8}
              maxW="fit-content"
            >
              <Tab color="white" borderRadius="xl" _selected={{ bg: 'purple.600', color: 'white' }}>
                Active Circles ({activeChamas.length})
              </Tab>
              <Tab color="white" borderRadius="xl" _selected={{ bg: 'purple.600', color: 'white' }}>
                Completed ({completedChamas.length})
              </Tab>
              <Tab color="white" borderRadius="xl" _selected={{ bg: 'red.600', color: 'white' }}>
                Ejected & Defaulted ({ejectedChamas.length})
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel p={0}>
                {renderChamaGrid(activeChamas, 'active')}
              </TabPanel>
              <TabPanel p={0}>
                {renderChamaGrid(completedChamas, 'completed')}
              </TabPanel>
              <TabPanel p={0}>
                {renderChamaGrid(ejectedChamas, 'ejected')}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Container>
      </Box>
    </>
  );
}
