import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  Input,
  Select,
  Button,
  HStack,
  VStack,
  Badge,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Stack,
  Flex,
  Icon,
} from '@chakra-ui/react';
import { useSorobanReact } from '@soroban-react/core';
import { useMesaCore, Chama } from '../hooks/useMesaCore';
import { SUPPORTED_ASSETS } from '../utils/config';
import { FiSearch, FiPlus, FiUsers, FiClock, FiDollarSign } from 'react-icons/fi';
import toast from 'react-hot-toast';
import 'twin.macro';

export default function DiscoverPage() {
  const sorobanContext = useSorobanReact();
  const { address } = sorobanContext;
  const { getChamas, createChama, joinChama } = useMesaCore();

  const [chamas, setChamas] = useState<Chama[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('ALL');

  // Create Chama Form State
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [newName, setNewName] = useState('');
  const [newAsset, setNewAsset] = useState('USDC');
  const [newContribution, setNewContribution] = useState(100);
  const [newDuration, setNewDuration] = useState(86400 * 7); // 1 week
  const [newMembers, setNewMembers] = useState('');

  // Fetch chamas on load
  useEffect(() => {
    setChamas(getChamas());
  }, [getChamas, isOpen]);

  const handleCreate = async () => {
    if (!newName) {
      toast.error('Please enter a circle name');
      return;
    }
    const token = SUPPORTED_ASSETS[newAsset]?.contractId;
    if (!token) {
      toast.error('Invalid asset selected');
      return;
    }

    // Split member input and trim whitespace. Ensure creator is in the list
    let memberList = newMembers
      .split(',')
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    const userAddr = address || 'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TUSDC';
    if (!memberList.includes(userAddr)) {
      memberList.unshift(userAddr);
    }

    try {
      const newId = await createChama(
        newName,
        token,
        newContribution,
        newDuration,
        memberList,
        [...memberList] // default rotation order matches initial member list
      );
      toast.success('Savings Circle created successfully!');
      setChamas(getChamas());
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Failed to create circle');
    }
  };

  const handleJoin = async (chamaId: string) => {
    try {
      await joinChama(chamaId);
      setChamas(getChamas());
    } catch (e) {
      console.error(e);
    }
  };

  // Filter chamas
  const filteredChamas = chamas.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAsset = selectedAsset === 'ALL' || c.tokenCode === selectedAsset;
    return matchesSearch && matchesAsset;
  });

  return (
    <>
      <Head>
        <title>Discover Circles | Mesa Protocol</title>
        <meta name="description" content="Discover active savings circles on Mesa Protocol" />
      </Head>

      <Box py={8} bgGradient="linear(to-b, #050508, #0c0a15)" minH="90vh">
        <Container maxW="container.xl">
          {/* Header Banner */}
          <Flex
            direction={{ base: 'column', md: 'row' }}
            justify="space-between"
            align={{ base: 'start', md: 'center' }}
            mb={10}
            p={8}
            borderRadius="3xl"
            bg="rgba(255, 255, 255, 0.02)"
            backdropFilter="blur(20px)"
            border="1px solid rgba(255, 255, 255, 0.05)"
            boxShadow="0 8px 32px 0 rgba(0, 0, 0, 0.3)"
          >
            <VStack align="start" spacing={2} maxW="2xl">
              <Heading fontSize="3xl" fontWeight="extrabold" color="white">
                Discover Rotating Savings Circles
              </Heading>
              <Text color="whiteAlpha.700" fontSize="md">
                ROSCA groups (Chamas) let members save together and receive lump-sum payouts in turns.
                Select an active circle to join, or create your own with customized terms and multi-asset payouts.
              </Text>
            </VStack>
            <Button
              onClick={onOpen}
              leftIcon={<FiPlus />}
              colorScheme="purple"
              size="lg"
              borderRadius="xl"
              mt={{ base: 4, md: 0 }}
              px={8}
              boxShadow="0 0 20px rgba(128, 90, 213, 0.4)"
              _hover={{ transform: 'translateY(-2px)', boxShadow: '0 0 25px rgba(128, 90, 213, 0.6)' }}
              transition="all 0.2s"
            >
              Create Circle
            </Button>
          </Flex>

          {/* Filters and Search */}
          <HStack spacing={4} mb={8} direction={{ base: 'column', md: 'row' }} w="full">
            <Box position="relative" flex={1}>
              <Input
                placeholder="Search circles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                bg="whiteAlpha.50"
                borderColor="whiteAlpha.100"
                _hover={{ borderColor: 'whiteAlpha.300' }}
                _focus={{ borderColor: 'purple.500', boxShadow: 'none' }}
                borderRadius="xl"
                py={6}
                pl={12}
                color="white"
              />
              <Box position="absolute" left={4} top="50%" transform="translateY(-50%)" opacity={0.5}>
                <FiSearch size={20} />
              </Box>
            </Box>

            <Select
              maxW="200px"
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              bg="whiteAlpha.50"
              borderColor="whiteAlpha.100"
              borderRadius="xl"
              h="50px"
              color="white"
            >
              <option value="ALL">All Assets</option>
              <option value="USDC">USDC</option>
              <option value="EURC">EURC</option>
              <option value="KES">KES</option>
            </Select>
          </HStack>

          {/* Chama Grid */}
          {filteredChamas.length === 0 ? (
            <Flex
              direction="column"
              align="center"
              justify="center"
              py={20}
              bg="whiteAlpha.50"
              borderRadius="3xl"
              border="1px dashed rgba(255, 255, 255, 0.1)"
            >
              <Text color="whiteAlpha.600" fontSize="lg" mb={4}>
                No savings circles found matching your criteria.
              </Text>
              <Button onClick={onOpen} colorScheme="purple" variant="outline" borderRadius="xl">
                Be the first to create one
              </Button>
            </Flex>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {filteredChamas.map((chama) => {
                const userAddr = address || 'GD3F465F5M4JZ3XN7YMXH43M74RJZ36K4M7FZXNJ4KMLZ6FMXZ7TUSDC';
                const isMember = chama.members.includes(userAddr);
                const assetMeta = SUPPORTED_ASSETS[chama.tokenCode];

                return (
                  <Box
                    key={chama.id}
                    p={6}
                    borderRadius="2xl"
                    bg="rgba(255, 255, 255, 0.02)"
                    border="1px solid rgba(255, 255, 255, 0.05)"
                    _hover={{
                      transform: 'translateY(-4px)',
                      borderColor: 'purple.500',
                      bg: 'rgba(255, 255, 255, 0.04)',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                    }}
                    transition="all 0.3s ease"
                  >
                    <Flex justify="space-between" align="start" mb={4}>
                      <Badge colorScheme="purple" p={2} borderRadius="lg" fontSize="xs">
                        {assetMeta?.icon} {chama.tokenCode}
                      </Badge>
                      <Badge colorScheme="teal" borderRadius="full" px={3} py={1}>
                        Round {chama.currentRound + 1}
                      </Badge>
                    </Flex>

                    <Heading size="md" color="white" mb={3} noOfLines={1}>
                      {chama.name}
                    </Heading>

                    <VStack align="start" spacing={3} mb={6} fontSize="sm" color="whiteAlpha.700">
                      <HStack>
                        <Icon as={FiDollarSign} color="purple.400" />
                        <Text>
                          Contribution: <strong tw="text-white">{chama.contributionAmount} {chama.tokenCode}</strong> / round
                        </Text>
                      </HStack>
                      <HStack>
                        <Icon as={FiClock} color="purple.400" />
                        <Text>
                          Duration: <strong tw="text-white">
                            {chama.roundDuration === 86400 ? 'Daily' : chama.roundDuration === 604800 ? 'Weekly' : 'Bi-weekly'}
                          </strong>
                        </Text>
                      </HStack>
                      <HStack>
                        <Icon as={FiUsers} color="purple.400" />
                        <Text>
                          Members: <strong tw="text-white">{chama.members.length}</strong>
                        </Text>
                      </HStack>
                    </VStack>

                    <Flex gap={3}>
                      {isMember ? (
                        <Link href={`/chama/${chama.id}`} passHref legacyBehavior>
                          <Button flex={1} colorScheme="purple" borderRadius="xl">
                            Enter Dashboard
                          </Button>
                        </Link>
                      ) : (
                        <>
                          <Button
                            flex={1}
                            colorScheme="purple"
                            variant="outline"
                            borderRadius="xl"
                            onClick={() => handleJoin(chama.id)}
                          >
                            Join & Pay Deposit
                          </Button>
                          <Link href={`/chama/${chama.id}`} passHref legacyBehavior>
                            <Button variant="ghost" colorScheme="whiteAlpha" borderRadius="xl">
                              Details
                            </Button>
                          </Link>
                        </>
                      )}
                    </Flex>
                  </Box>
                );
              })}
            </SimpleGrid>
          )}
        </Container>
      </Box>

      {/* Create Chama Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered size="xl">
        <ModalOverlay backdropFilter="blur(15px)" bg="rgba(0, 0, 0, 0.7)" />
        <ModalContent
          bg="#0d0c15"
          border="1px solid rgba(255,255,255,0.1)"
          borderRadius="2xl"
          color="white"
        >
          <ModalHeader fontSize="2xl" fontWeight="extrabold">
            Create Savings Circle
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>Circle Name</FormLabel>
                <Input
                  placeholder="e.g. East Africa Business Circle"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  bg="whiteAlpha.50"
                  borderColor="whiteAlpha.100"
                />
              </FormControl>

              <SimpleGrid columns={2} spacing={4}>
                <FormControl>
                  <FormLabel>Contribution Asset</FormLabel>
                  <Select
                    value={newAsset}
                    onChange={(e) => setNewAsset(e.target.value)}
                    bg="whiteAlpha.50"
                    borderColor="whiteAlpha.100"
                  >
                    <option value="USDC">USDC (USD Stablecoin)</option>
                    <option value="EURC">EURC (Euro Stablecoin)</option>
                    <option value="KES">KES (Kenyan Shilling)</option>
                    <option value="XLM">XLM (Stellar Lumen)</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Amount per Round</FormLabel>
                  <Input
                    type="number"
                    value={newContribution}
                    onChange={(e) => setNewContribution(Number(e.target.value))}
                    bg="whiteAlpha.50"
                    borderColor="whiteAlpha.100"
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Round Duration</FormLabel>
                <Select
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value))}
                  bg="whiteAlpha.50"
                  borderColor="whiteAlpha.100"
                >
                  <option value={86400}>Daily (Testing)</option>
                  <option value={86400 * 7}>Weekly (Standard)</option>
                  <option value={86400 * 14}>Bi-Weekly</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Initial Members (Comma separated G-addresses)</FormLabel>
                <Input
                  placeholder="GD3F465..., GD2A49B..."
                  value={newMembers}
                  onChange={(e) => setNewMembers(e.target.value)}
                  bg="whiteAlpha.50"
                  borderColor="whiteAlpha.100"
                />
                <Text fontSize="2xs" color="whiteAlpha.500" mt={1}>
                  Note: Your wallet address will automatically be included as the first member.
                </Text>
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter borderTop="1px solid rgba(255,255,255,0.05)" mt={6}>
            <Button variant="ghost" onClick={onClose} mr={3} colorScheme="whiteAlpha">
              Cancel
            </Button>
            <Button colorScheme="purple" px={6} onClick={handleCreate}>
              Deploy & Initialize
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
