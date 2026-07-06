import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Box, Flex, HStack, Text, Container, Link as ChakraLink } from '@chakra-ui/react';
import { ConnectButton } from '../web3/ConnectButton';
import 'twin.macro';

export const Navbar: React.FC = () => {
  const router = useRouter();

  const navLinks = [
    { label: 'Discover Circles', path: '/discover' },
    { label: 'My Savings Circles', path: '/my-chamas' },
  ];

  return (
    <Box
      as="header"
      position="sticky"
      top="0"
      zIndex="1000"
      bg="rgba(10, 10, 15, 0.7)"
      backdropFilter="blur(12px)"
      borderBottom="1px solid rgba(255, 255, 255, 0.08)"
      py={4}
    >
      <Container maxW="container.xl">
        <Flex align="center" justify="space-between">
          <Link href="/discover" passHref legacyBehavior>
            <HStack cursor="pointer" spacing={2}>
              <Text
                fontSize="2xl"
                fontWeight="extrabold"
                bgGradient="linear(to-r, cyan.400, purple.500, pink.500)"
                bgClip="text"
                letterSpacing="wider"
                tw="hover:opacity-90 transition-opacity"
              >
                MESA PROTOCOL
              </Text>
              <Box
                px={2}
                py={0.5}
                bgGradient="linear(to-r, purple.500, pink.500)"
                color="white"
                fontSize="2xs"
                fontWeight="bold"
                borderRadius="full"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                Chama / ROSCA
              </Box>
            </HStack>
          </Link>

          <HStack spacing={8}>
            <HStack spacing={6} display={{ base: 'none', md: 'flex' }}>
              {navLinks.map((link) => {
                const isActive = router.pathname === link.path;
                return (
                  <Link key={link.path} href={link.path} passHref legacyBehavior>
                    <ChakraLink
                      fontSize="sm"
                      fontWeight="semibold"
                      color={isActive ? 'cyan.300' : 'whiteAlpha.800'}
                      _hover={{ color: 'cyan.200', textDecoration: 'none' }}
                      transition="all 0.2s"
                      position="relative"
                      _after={
                        isActive
                          ? {
                              content: '""',
                              position: 'absolute',
                              bottom: '-6px',
                              left: '0',
                              width: '100%',
                              height: '2px',
                              bg: 'cyan.300',
                            }
                          : undefined
                      }
                    >
                      {link.label}
                    </ChakraLink>
                  </Link>
                );
              })}
            </HStack>

            <ConnectButton />
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
};
