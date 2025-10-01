/**
 * Custom Next.js Server with Socket.IO Integration
 * This server integrates Socket.IO with the Next.js application
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT, 10) || 3000;

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server
  const server = createServer(async (req, res) => {
    try {
      // Sanitize URL to prevent ByteString encoding errors
      let sanitizedUrl = req.url;
      if (sanitizedUrl) {
        // Replace problematic Unicode characters that cause ByteString errors
        sanitizedUrl = sanitizedUrl.replace(/[^\x00-\xFF]/g, ''); // Remove non-ASCII characters
        // Ensure URL is properly encoded
        try {
          sanitizedUrl = decodeURIComponent(sanitizedUrl);
          sanitizedUrl = encodeURI(sanitizedUrl);
        } catch (encodeError) {
          // If encoding fails, use original URL but log the issue
          console.warn('URL encoding issue:', encodeError.message);
          sanitizedUrl = req.url;
        }
      }

      const parsedUrl = parse(sanitizedUrl, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO with error handling and timeout protection
  console.log('Initializing Socket.IO server...');

  try {
    const io = new Server(server, {
      path: '/api/socket/social-wall',
      cors: {
        origin: process.env.NEXTAUTH_URL || `http://localhost:${port}`,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Store Socket.IO instance globally for access in API routes
    global.__socialWallSocketIO = io;
    console.log('Socket.IO server created successfully');

    // Initialize basic socket namespaces
    try {
      // Admin messaging namespace
      const adminMessaging = io.of('/admin-messaging');
      adminMessaging.on('connection', (socket) => {
        console.log('Admin connected to messaging:', socket.id);

        socket.on('subscribe:inbox', () => {
          socket.emit('inbox:subscribed', { success: true });
        });

        socket.on('disconnect', () => {
          console.log('Admin disconnected from messaging:', socket.id);
        });
      });

      // General messaging namespace with proper event handlers
      const messaging = io.of('/messaging');
      messaging.on('connection', (socket) => {
        console.log('User connected to messaging:', socket.id);

        // Join user-specific room
        const userId = socket.handshake.auth.userId;
        if (userId) {
          socket.join(`user-${userId}`);
          console.log(`User ${userId} joined messaging room`);
        }

        // Handle message sending
        socket.on('message:send', (data) => {
          console.log('Message sent via socket:', data);
          // Broadcast to recipients
          if (data.recipients && Array.isArray(data.recipients)) {
            data.recipients.forEach(recipientId => {
              socket.to(`user-${recipientId}`).emit('message:new', {
                type: 'message:new',
                message: data,
                timestamp: new Date()
              });
            });
          }
        });

        // Handle mark as read
        socket.on('message:read', (data) => {
          console.log('Message marked as read via socket:', data);
          // Broadcast read status to sender
          socket.broadcast.emit('message:read', {
            messageId: data.messageId,
            userId: userId,
            timestamp: new Date()
          });
        });

        // Handle typing indicators
        socket.on('user:typing', (data) => {
          socket.broadcast.emit('user:typing', {
            userId: userId,
            isTyping: data.isTyping,
            timestamp: new Date()
          });
        });

        // Handle class room joining
        socket.on('join:class', (data) => {
          if (data.classId) {
            socket.join(`class-${data.classId}`);
            console.log(`User ${userId} joined class ${data.classId}`);
          }
        });

        // Handle class room leaving
        socket.on('leave:class', (data) => {
          if (data.classId) {
            socket.leave(`class-${data.classId}`);
            console.log(`User ${userId} left class ${data.classId}`);
          }
        });

        socket.on('disconnect', () => {
          console.log('User disconnected from messaging:', socket.id);
        });
      });

      console.log('Basic socket namespaces initialized successfully');
    } catch (error) {
      console.error('Failed to initialize socket namespaces:', error);
    }

    // Set up dynamic namespaces for class-specific connections
    io.of(/^\/class-[\w]+$/).on('connection', (socket) => {
      const classId = socket.nsp.name.replace('/class-', '');
      console.log(`User connected to class ${classId}:`, socket.id);

      // Handle social wall posts
      socket.on('new-post', (data) => {
        socket.to(socket.nsp.name).emit('post-created', data);
        console.log(`New post in class ${classId}:`, data.id);
      });

      // Handle post updates
      socket.on('update-post', (data) => {
        socket.to(socket.nsp.name).emit('post-updated', data);
        console.log(`Post updated in class ${classId}:`, data.id);
      });

      // Handle post deletions
      socket.on('delete-post', (data) => {
        socket.to(socket.nsp.name).emit('post-deleted', data);
        console.log(`Post deleted in class ${classId}:`, data.id);
      });

      // Handle reactions
      socket.on('add-reaction', (data) => {
        socket.to(socket.nsp.name).emit('reaction-added', data);
      });

      socket.on('remove-reaction', (data) => {
        socket.to(socket.nsp.name).emit('reaction-removed', data);
      });

      // Handle comments
      socket.on('new-comment', (data) => {
        socket.to(socket.nsp.name).emit('comment-created', data);
      });

      socket.on('disconnect', () => {
        console.log(`User disconnected from class ${classId}:`, socket.id);
      });
    });

    // Basic connection handler for non-namespace connections
    io.on('connection', (socket) => {
      console.log('User connected to main namespace:', socket.id);

      socket.on('disconnect', () => {
        console.log('User disconnected from main namespace:', socket.id);
      });
    });

    console.log('Socket.IO namespaces and event handlers set up successfully');

  } catch (error) {
    console.error('Failed to initialize Socket.IO:', error);
    // Store a dummy Socket.IO instance to prevent crashes
    global.__socialWallSocketIO = {
      emit: () => {},
      to: () => ({ emit: () => {} }),
      on: () => {},
    };
  }

  // Start the server
  server
    .once('error', (err) => {
      console.error('Server error:', err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Socket.IO server running on path: /api/socket/social-wall`);

      // Initialize optimized server components
      if (process.env.FAST_STARTUP !== 'true') {
        console.log('Starting server initialization...');
      }

      // Only enable memory monitoring in production or when explicitly enabled
      const enableMemoryMonitoring = process.env.NODE_ENV === 'production' ||
                                    process.env.ENABLE_MEMORY_MONITORING === 'true';

      if (enableMemoryMonitoring) {
        // Use setTimeout to avoid blocking the main thread
        setTimeout(() => {
          try {
            console.log('Initializing memory monitoring...');

            // Basic memory monitoring with longer intervals for better performance
            setInterval(() => {
              const memUsage = process.memoryUsage();
              const memUsageMB = {
                rss: Math.round(memUsage.rss / 1024 / 1024),
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                external: Math.round(memUsage.external / 1024 / 1024),
              };

              // Only log if memory usage is concerning
              if (memUsageMB.heapUsed > 512) {
                console.log('Memory usage (MB):', memUsageMB);
              }

              // Trigger GC if memory usage is high
              if (memUsageMB.heapUsed > 1000) {
                console.warn('High memory usage detected:', memUsageMB);
                if (global.gc) {
                  global.gc();
                  console.log('Forced garbage collection');
                }
              }
            }, 600000); // 10 minutes interval for better performance

          } catch (error) {
            console.error('Memory monitoring initialization failed:', error);
          }
        }, 2000); // 2 second delay
      } else {
        // In development, just log initial memory usage and set up basic monitoring
        const memUsage = process.memoryUsage();
        const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        console.log(`Initial memory usage: ${memUsageMB}MB (monitoring disabled)`);

        // Set up basic memory monitoring in development to catch memory leaks
        if (memUsageMB > 200) {
          console.warn('High initial memory usage detected. Consider restarting the development server.');
        }

        // Force garbage collection if available and memory is high
        if (global.gc && memUsageMB > 300) {
          global.gc();
          console.log('Forced garbage collection due to high memory usage');
        }

        console.log('Server startup completed successfully');
      }

      console.log('Exiting server listen callback...');
    });

  console.log('Setting up graceful shutdown handlers...');

  // Graceful shutdown
  const gracefulShutdown = (signal) => {
    console.log(`${signal} received, shutting down gracefully`);

    try {
      // Try to gracefully shutdown socket server if it exists
      if (global.socialWallSocketServer && typeof global.socialWallSocketServer.shutdown === 'function') {
        global.socialWallSocketServer.shutdown();
      }
    } catch (error) {
      console.error('Error during socket server shutdown:', error);
    }

    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      console.log('Forcing exit...');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle memory issues
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
  });

  console.log('All event handlers set up. Server initialization complete.');
});

console.log('Server setup complete, waiting for app.prepare()...');
