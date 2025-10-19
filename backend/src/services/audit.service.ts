import { prisma } from '../config/database';
import { AuditAction } from '../types';

interface AuditLogData {
  userId?: string;
  action: AuditAction;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
}

export const createAuditLog = async ({
  userId,
  action,
  details,
  ipAddress,
  userAgent,
  success = true,
}: AuditLogData): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        details: details ? JSON.stringify(details) : null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        success,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};


export const getUserAuditLogs = async (
  userId: string,
  limit: number = 50
): Promise<any[]> => {
  return await prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      action: true,
      details: true,
      ipAddress: true,
      success: true,
      createdAt: true,
    },
  });
};


export const getAllAuditLogs = async (
  page: number = 1,
  limit: number = 50
): Promise<{ logs: any[]; total: number }> => {
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    }),
    prisma.auditLog.count(),
  ]);

  return { logs, total };
};