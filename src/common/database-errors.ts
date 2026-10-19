import { HttpException, HttpStatus } from '@nestjs/common';

interface PostgrestErrorLike {
  code?: string;
  message?: string;
}

/**
 * Traduce errores de PostgREST/PostgreSQL a respuestas HTTP sin filtrar
 * detalles internos de la base de datos.
 */
export function throwDatabaseError(error: PostgrestErrorLike): never {
  const code = error.code ?? '';

  switch (code) {
    case '23505':
      throw new HttpException(
        { message: 'Resource already exists', code: 'RESOURCE_CONFLICT' },
        HttpStatus.CONFLICT,
      );
    case '23503':
      throw new HttpException(
        {
          message: 'Related resource does not exist or is still referenced',
          code: 'FOREIGN_KEY_VIOLATION',
        },
        HttpStatus.CONFLICT,
      );
    case '23502':
    case '23514':
    case '22P02':
      throw new HttpException(
        { message: 'Data violates a database constraint', code: 'INVALID_DATA' },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    case '42501':
      throw new HttpException(
        { message: 'Insufficient permissions for this resource', code: 'FORBIDDEN' },
        HttpStatus.FORBIDDEN,
      );
    case 'PGRST116':
      throw new HttpException(
        { message: 'Resource not found', code: 'RESOURCE_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    case 'PGRST301':
    case 'PGRST302':
      throw new HttpException(
        { message: 'Invalid or expired access token', code: 'AUTH_TOKEN_INVALID' },
        HttpStatus.UNAUTHORIZED,
      );
    default:
      throw new HttpException(
        { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
  }
}
