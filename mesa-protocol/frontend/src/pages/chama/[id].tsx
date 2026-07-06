import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  Button,
  VStack,
  HStack,
  Badge,
  Stack,
  Flex,
  Icon,
  Progress,
  Divider,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  CircularProgress,
  CircularProgressLabel,
  Card,
  Spinner,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import { useSorobanReact } from '@soroban-react/core';
import { useMesaCore, Chama } from '../../hooks/useMesaCore';
import { findStrictReceivePath, fetchUserBalances, UserBalance, PathResult } from '../../utils/pathPayment';
import { SUPPORTED_ASSETS } from '../../utils/config';
import { FiClock, FiUsers, FiDollarSign, FiShield, FiAlertTriangle, FiArrowRight, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import 'twin.macro';

export default function ChamaDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const sorobanContext = useSorobanReact();
  const { address } = sorobanContext;

  const { getChama, contribute, joinChama, distributeRound, flagEmergency, withdrawPrincipal, loading } = useMesaCore();

  const [chama, setChama] = useState<Chama | null>(null);
  const [balances, setBalances] = useState<UserBalance[]>([]);
  const [selectedPayAsset, setSelectedPayAsset] = useState<string>('USDC');
  const [pathResult, setPathResult] = useState<PathResult | null>(null);
  const [calculatingPath, setCalculatingPath] = useState<boolean>(false);
  const [pageLoading, setPageLoading] = useState<boolean>(true);

  // Time remaining calculator
  const [timeLeft, setTimeLeft] = useState<string>('');

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getChama(id as string);
      setChama(data);
      setSelectedPayAsset(data.tokenCode); // Default input to match chama asset
      
      const userAddr = address || 'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TUSDC';
      const userBals = await fetchUserBalances(userAddr);
      setBalances(userBals);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load circle data');
    } finally {
      setPageLoading(false);
    }
  }, [id, address, getChama]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Recalculate Path finding whenever asset selector changes
  useEffect(() => {
    if (!chama || !selectedPayAsset) return;
    const calculatePath = async () => {
      setCalculatingPath(true);
      try {
        const result = await findStrictReceivePath(
          selectedPayAsset,
          chama.tokenCode,
          chama.contributionAmount,
          address
        );
        setPathResult(result);
      } catch (err) {
        console.error(err);
      } finally {
        setCalculatingPath(false);
      }
    };
    calculatePath();
  }, [selectedPayAsset, chama, address]);

  // Countdown timer effect
  useEffect(() => {
    if (!chama) return;
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const diff = chama.roundDeadline - now;
      if (diff <= 0) {
        setTimeLeft('Expired');
        clearInterval(interval);
      } else {
        const d = Math.floor(diff / 86400);
        const h = Math.floor((diff % 86400) / 3600);
        const m = Math.floor((diff % 3600) / 60);
        setTimeLeft(`${d}d ${h}h ${m}m remaining`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [chama]);

  if (pageLoading || !chama) {
    return (
      <Flex minH="90vh" align="center" justify="center" bg="#050508">
        <Spinner size="xl" color="purple.500" thickness="4px" />
      </Flex>
    );
  }

  const userAddr = address || 'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TUSDC';
  const isMember = chama.members.includes(userAddr);
  const currentWinner = chama.rotationOrder[chama.currentRound % chama.rotationOrder.length];
  const allContributed = chama.members.every(m => chama.contributions[m] === true);

  const handlePayContribution = async () => {
    try {
      if (selectedPayAsset !== chama.tokenCode && pathResult) {
        // Path payment simulation message
        toast.loading(`Swapping ${pathResult.sourceAmount} ${selectedPayAsset} -> ${chama.contributionAmount} ${chama.tokenCode}...`, { id: 'pathpay' });
      }
      await contribute(chama.id, userAddr);
      toast.dismiss('pathpay');
      loadData();
    } catch (e) {
      console.error(e);
      toast.dismiss('pathpay');
      toast.error('Contribution failed');
    }
  };

  const handleJoinCircle = async () => {
    await joinChama(chama.id);
    loadData();
  };

  const handleDistribute = async () => {
    await distributeRound(chama.id);
    loadData();
  };

  const handleEmergency = async () => {
    await flagEmergency(chama.id);
    loadData();
  };

  const handleWithdraw = async () => {
    await withdrawPrincipal(chama.id);
    loadData();
  };

  return (
    <>
      <Head>
        <title>{chama.name} | Mesa Protocol</title>
      </Head>

      <Box py={8} bgGradient="linear(to-b, #050508, #0c0a15)" minH="90vh">
        <Container maxW="container.xl">
          {/* Top Banner and Navigation Back */}
          <Link href="/discover" passHref legacyBehavior>
            <Button variant="ghost" color="whiteAlpha.700" mb={6} _hover={{ color: 'white' }}>
              ← Back to Discover
            </Button>
          </Link>

          {/* Heading */}
          <Flex justify="space-between" align={{ base: 'start', md: 'center' }} direction={{ base: 'column', md: 'row' }} mb={8}>
            <VStack align="start" spacing={1}>
              <HStack>
                <Heading size="lg" color="white">
                  {chama.name}
                </Heading>
                {chama.emergencyMode && (
                  <Badge colorScheme="red" variant="solid" p={1} borderRadius="md">
                    Emergency Paused
                  </Badge>
                )}
              </HStack>
              <Text fontSize="sm" color="whiteAlpha.600" fontFamily="mono">
                Contract ID: {chama.id}
              </Text>
            </VStack>

            <HStack spacing={3} mt={{ base: 4, md: 0 }}>
              <Badge colorScheme="purple" p={2} borderRadius="md" fontSize="sm">
                Base Asset: {SUPPORTED_ASSETS[chama.tokenCode]?.icon} {chama.tokenCode}
              </Badge>
              <Badge colorScheme="teal" p={2} borderRadius="md" fontSize="sm">
                Round {chama.currentRound + 1} of {chama.members.length}
              </Badge>
            </HStack>
          </Flex>

          {/* Grid Layout for details */}
          <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={8} mb={8}>
            
            {/* Column 1 & 2: Stats and Timelines */}
            <Stack spacing={8} gridColumn={{ lg: 'span 2' }}>
              
              {/* Stats Overview */}
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <Card bg="whiteAlpha.50" border="1px solid rgba(255,255,255,0.05)" p={6} borderRadius="2xl">
                  <Stat>
                    <StatLabel color="whiteAlpha.600">Round Payout Pot</StatLabel>
                    <StatNumber color="cyan.300">
                      {chama.contributionAmount * chama.members.length} {chama.tokenCode}
                    </StatNumber>
                    <StatHelpText color="whiteAlpha.500">
                      Accumulated from {chama.members.length} members
                    </StatHelpText>
                  </Stat>
                </Card>

                <Card bg="whiteAlpha.50" border="1px solid rgba(255,255,255,0.05)" p={6} borderRadius="2xl">
                  <Stat>
                    <StatLabel color="whiteAlpha.600">Next Payout Turn</StatLabel>
                    <StatNumber color="purple.300">
                      {currentWinner === userAddr ? 'You' : `${currentWinner.substring(0, 8)}...`}
                    </StatNumber>
                    <StatHelpText color="whiteAlpha.500">
                      Winner of Round {chama.currentRound + 1}
                    </StatHelpText>
                  </Stat>
                </Card>

                <Card bg="whiteAlpha.50" border="1px solid rgba(255,255,255,0.05)" p={6} borderRadius="2xl">
                  <Stat>
                    <StatLabel color="whiteAlpha.600">Payout Deadline</StatLabel>
                    <StatNumber color="pink.300" fontSize="lg">
                      {timeLeft}
                    </StatNumber>
                    <StatHelpText color="whiteAlpha.500">
                      Cycle duration: {chama.roundDuration === 86400 ? '24 Hours' : '7 Days'}
                    </StatHelpText>
                  </Stat>
                </Card>
              </SimpleGrid>

              {/* Step / Timeline Indicator */}
              <Card bg="whiteAlpha.50" border="1px solid rgba(255,255,255,0.05)" p={6} borderRadius="2xl" color="white">
                <Heading size="md" mb={6}>
                  Rotation Payout Timeline
                </Heading>
                
                <Stack spacing={4}>
                  {chama.rotationOrder.map((member, idx) => {
                    const isWinner = chama.rotationOrder[chama.currentRound % chama.rotationOrder.length] === member;
                    const alreadyPaidOut = idx < chama.currentRound;
                    const hasContributedThisRound = chama.contributions[member];
                    
                    return (
                      <Flex key={member} align="center" justify="space-between" p={3} bg={isWinner ? 'rgba(128, 90, 213, 0.1)' : 'transparent'} borderRadius="xl" border={isWinner ? '1px solid rgba(128, 90, 213, 0.2)' : 'none'}>
                        <HStack spacing={4}>
                          <CircularProgress
                            value={alreadyPaidOut ? 100 : isWinner ? 50 : 0}
                            color={alreadyPaidOut ? 'teal.400' : 'purple.500'}
                            size="30px"
                          >
                            <CircularProgressLabel fontSize="2xs">{idx + 1}</CircularProgressLabel>
                          </CircularProgress>
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="semibold" fontSize="sm">
                              {member === userAddr ? 'You (Active Member)' : `Member ${member.substring(0, 10)}...`}
                            </Text>
                            <Text fontSize="2xs" color="whiteAlpha.500">
                              Order index: {idx + 1}
                            </Text>
                          </VStack>
                        </HStack>

                        <HStack spacing={3}>
                          {hasContributedThisRound ? (
                            <Badge colorScheme="green">Paid Round</Badge>
                          ) : (
                            <Badge colorScheme="orange">Unpaid</Badge>
                          )}
                          {isWinner && <Badge colorScheme="purple">Current Pot Winner</Badge>}
                          {alreadyPaidOut && <Badge colorScheme="teal">Payout Received</Badge>}
                        </HStack>
                      </Flex>
                    );
                  })}
                </Stack>
              </Card>

              {/* Members miss / deposit details table */}
              <Card bg="whiteAlpha.50" border="1px solid rgba(255,255,255,0.05)" p={6} borderRadius="2xl" color="white">
                <Heading size="md" mb={4}>
                  Security Deposits & Delinquency Tracking
                </Heading>
                <Table variant="simple" colorScheme="whiteAlpha">
                  <Thead>
                    <Tr>
                      <Th color="whiteAlpha.600">Member Address</Th>
                      <Th color="whiteAlpha.600" isNumeric>Security Deposit</Th>
                      <Th color="whiteAlpha.600" isNumeric>Missed Payments</Th>
                      <Th color="whiteAlpha.600">Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {Object.keys(chama.missedPayments).map((m) => {
                      const missed = chama.missedPayments[m] || 0;
                      const deposit = chama.securityDeposits[m] || 0;
                      const activeMember = chama.members.includes(m);
                      
                      return (
                        <Tr key={m}>
                          <Td fontSize="xs" fontFamily="mono">
                            {m === userAddr ? 'You' : m.substring(0, 16)}...
                          </Td>
                          <Td isNumeric>{deposit} {chama.tokenCode}</Td>
                          <Td isNumeric color={missed >= 1 ? 'red.300' : 'white'}>
                            {missed}
                          </Td>
                          <Td>
                            {activeMember ? (
                              <Badge colorScheme="green">Active</Badge>
                            ) : (
                              <Badge colorScheme="red">Ejected (Forfeited)</Badge>
                            )}
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </Card>
            </Stack>

            {/* Column 3: Actions and Contribution Module */}
            <Stack spacing={8}>
              
              {/* Contribution Module */}
              <Card bg="whiteAlpha.50" border="1px solid rgba(255,255,255,0.05)" p={6} borderRadius="2xl" color="white">
                <Heading size="md" mb={4}>
                  Contribute to Round
                </Heading>

                {chama.emergencyMode ? (
                  <Text color="red.300" fontSize="sm" mb={4}>
                    Circle is paused due to emergency. No contributions can be made.
                  </Text>
                ) : !isMember ? (
                  <VStack spacing={4} align="stretch">
                    <Text fontSize="sm" color="whiteAlpha.700">
                      You are not currently a member of this savings circle.
                    </Text>
                    <Button onClick={handleJoinCircle} colorScheme="purple" w="full" borderRadius="xl">
                      Join & Pay 2x Security Deposit
                    </Button>
                  </VStack>
                ) : chama.contributions[userAddr] ? (
                  <VStack spacing={4} align="center" py={6}>
                    <Icon as={FiCheckCircle} color="green.400" size={40} />
                    <Text fontWeight="semibold" color="green.300">
                      Your Round Contribution is Paid!
                    </Text>
                    <Text fontSize="xs" color="whiteAlpha.600" textAlign="center">
                      Waiting for other members to pay before the round can be distributed.
                    </Text>
                  </VStack>
                ) : (
                  <VStack spacing={4} align="stretch">
                    <FormControl>
                      <FormLabel fontSize="sm" color="whiteAlpha.600">
                        Asset to Pay From
                      </FormLabel>
                      <Select
                        value={selectedPayAsset}
                        onChange={(e) => setSelectedPayAsset(e.target.value)}
                        bg="blackAlpha.500"
                        borderColor="whiteAlpha.200"
                      >
                        <option value="USDC">USDC (Base Asset)</option>
                        <option value="EURC">EURC (Stablecoin Swap)</option>
                        <option value="KES">KES (Kenyan Shilling Swap)</option>
                        <option value="XLM">XLM (Lumen Swap)</option>
                      </Select>
                    </FormControl>

                    {/* Path Finding Details */}
                    {calculatingPath ? (
                      <Flex py={4} justify="center">
                        <Spinner size="sm" color="purple.400" />
                      </Flex>
                    ) : pathResult ? (
                      <Box p={3} bg="whiteAlpha.50" borderRadius="xl" fontSize="xs">
                        <HStack justify="space-between" mb={2}>
                          <Text color="whiteAlpha.600">Pathfinder Swap Route:</Text>
                          <Badge colorScheme="purple">Horizon Router</Badge>
                        </HStack>
                        <Text fontWeight="bold" color="cyan.300" mb={1}>
                          Pay {pathResult.sourceAmount} {selectedPayAsset}
                        </Text>
                        <Text color="whiteAlpha.600" mb={2}>
                          to deliver {pathResult.destinationAmount} {chama.tokenCode}
                        </Text>
                        <Divider mb={2} />
                        <HStack justify="space-between">
                          <Text color="whiteAlpha.500">Exchange Rate:</Text>
                          <Text>1 {chama.tokenCode} ≈ {pathResult.exchangeRate.toFixed(4)} {selectedPayAsset}</Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text color="whiteAlpha.500">Max Slippage:</Text>
                          <Text>1.00% (Protected)</Text>
                        </HStack>
                      </Box>
                    ) : null}

                    {/* Balance Info */}
                    <HStack justify="space-between" fontSize="xs" color="whiteAlpha.600">
                      <Text>Your {selectedPayAsset} Balance:</Text>
                      <Text fontWeight="bold">
                        {balances.find(b => b.assetCode === selectedPayAsset)?.balance || 0} {selectedPayAsset}
                      </Text>
                    </HStack>

                    <Button onClick={handlePayContribution} colorScheme="purple" w="full" borderRadius="xl">
                      {selectedPayAsset === chama.tokenCode 
                        ? 'Contribute Directly' 
                        : 'Contribute via Path Payment'}
                    </Button>
                  </VStack>
                )}
              </Card>

              {/* Administrative Payout Trigger */}
              {isMember && allContributed && !chama.emergencyMode && (
                <Card bg="purple.900" border="1px solid rgba(128, 90, 213, 0.4)" p={6} borderRadius="2xl" color="white">
                  <VStack spacing={4} align="stretch">
                    <Heading size="sm">Distribute Payout Pot</Heading>
                    <Text fontSize="xs" color="whiteAlpha.800">
                      All members have contributed! Trigger the distribution to transfer the round pot of 
                      <strong> {chama.contributionAmount * chama.members.length} {chama.tokenCode}</strong> to the current winner:
                      <strong> {currentWinner.substring(0, 10)}...</strong>
                    </Text>
                    <Button onClick={handleDistribute} colorScheme="teal" w="full" borderRadius="xl" rightIcon={<FiArrowRight />}>
                      Trigger Round Payout
                    </Button>
                  </VStack>
                </Card>
              )}

              {/* Emergency controls */}
              <Card bg="whiteAlpha.50" border="1px solid rgba(255,255,255,0.05)" p={6} borderRadius="2xl" color="white">
                <Heading size="sm" mb={3}>
                  Emergency Controls
                </Heading>
                
                {chama.emergencyMode ? (
                  <VStack spacing={4} align="stretch">
                    <Text fontSize="xs" color="red.300">
                      The circle is currently paused. You can claim back your deposited principal + security deposit.
                    </Text>
                    <Button onClick={handleWithdraw} colorScheme="red" variant="solid" w="full" borderRadius="xl">
                      Withdraw My Principal & Deposit
                    </Button>
                  </VStack>
                ) : (
                  <VStack spacing={4} align="stretch">
                    <Text fontSize="xs" color="whiteAlpha.600">
                      In case of consensus loss, any active member can flag the emergency mode to halt contributions and retrieve deposits.
                    </Text>
                    <Button onClick={handleEmergency} leftIcon={<FiAlertTriangle />} colorScheme="red" variant="outline" w="full" borderRadius="xl">
                      Flag Emergency Pause
                    </Button>
                  </VStack>
                )}
              </Card>
            </Stack>
          </SimpleGrid>
        </Container>
      </Box>
    </>
  );
}
