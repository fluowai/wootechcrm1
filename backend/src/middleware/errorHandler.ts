import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';

export interface AppError extends Error {
  status?: number;
  code?: string;
  details?: unknown;
}

export const errorHandler = (err: AppError, req: Request, res: Response, _next: NextFunction) => {
  logger.error('ErrorHandler', err.message, {
    method: req.method,
    path: req.path,
    status: err.status || 500,
    code: err.code,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2000') {
      return res.status(400).json({
        success: false,
        error: 'Valor muito longo para um dos campos. Verifique os dados enviados.',
        code: 'DB_VALUE_TOO_LONG'
      });
    }
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[]) || ['campo'];
      return res.status(409).json({
        success: false,
        error: `Conflito de dados: O valor para '${target.join(', ')}' já está em uso.`,
        code: 'DB_DUPLICATE_ENTRY'
      });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({
        success: false,
        error: 'Erro de relacionamento: O registro pai não foi encontrado.',
        code: 'DB_RELATION_ERROR'
      });
    }
    if (err.code === 'P2014') {
      return res.status(400).json({
        success: false,
        error: 'Violação de integridade referencial.',
        code: 'DB_REFERENTIAL_INTEGRITY'
      });
    }
    if (err.code === 'P2021') {
      return res.status(500).json({
        success: false,
        error: 'Tabela não encontrada no banco de dados. Execute as migrações.',
        code: 'DB_TABLE_NOT_FOUND'
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Registro não encontrado no banco de dados.',
        code: 'DB_NOT_FOUND'
      });
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      success: false,
      error: 'Dados inválidos enviados na requisição.',
      code: 'VALIDATION_ERROR'
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Dados inválidos enviados na requisição.',
      details: err.details,
      code: 'VALIDATION_ERROR'
    });
  }

  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: ['development', 'test'].includes(process.env.NODE_ENV || 'development')
      ? err.message || 'Erro interno no servidor Nexus360.'
      : 'Erro interno no servidor Nexus360.',
    code: err.code || 'INTERNAL_ERROR',
  });
};
