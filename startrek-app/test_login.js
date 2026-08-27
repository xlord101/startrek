const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { SignJWT } = require('jose');

const JWT_SECRET = new TextEncoder().encode('startrek_enterprise_super_secret_jwt_key_2026');

async function testLogin(email, password) {
  const prisma = new PrismaClient();
  try {
    const query = String(email).trim();
    const users = await prisma.user.findMany({ where: { isActive: true } });
    const user = users.find(u => u.email.toLowerCase() === query.toLowerCase() || u.name.toLowerCase() === query.toLowerCase());
    if (!user) { console.log('401 no user'); return; }
    
    // Bypass bcrypt compare for this specific test so we reach the session creation
    
    const token = await new SignJWT({
      userId: user.id, name: user.name, email: user.email, role: user.role
    }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('24h').sign(JWT_SECRET);
    
    await prisma.session.deleteMany({ where: { userId: user.id } });
    
    await prisma.session.create({
      data: {
        userId: user.id,
        token: token,
        expiresAt: new Date(Date.now() + 60 * 60 * 24 * 1000),
        ipAddress: 'unknown',
        userAgent: 'unknown',
      }
    });
    console.log('Success 200');
  } catch(e) {
    console.error('500 ERROR', e);
  } finally {
    await prisma.$disconnect();
  }
}
testLogin('kdoffice@kdexport.com', 'Kdexport@123');
