import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, check } from 'drizzle-orm/sqlite-core';
export const roles=sqliteTable('roles',{role:text('role').primaryKey(),salt:text('salt').notNull(),digest:text('digest').notNull()});
export const sessions=sqliteTable('sessions',{id:text('id').primaryKey(),role:text('role').notNull(),expires:integer('expires').notNull(),actor:text('actor').notNull()});
export const attempts=sqliteTable('attempts',{id:text('id').primaryKey(),count:integer('count').notNull(),until:integer('until').notNull()});
export const products=sqliteTable('products',{id:integer('id').primaryKey(),qty:integer('qty').notNull(),price:integer('price').notNull(),approved:integer('approved').notNull()},t=>[check('available',sql`${t.qty} >= 0`)]);
export const events=sqliteTable('events',{id:text('id').primaryKey(),time:integer('time').notNull(),kind:text('kind').notNull(),role:text('role').notNull(),payment:text('payment').notNull(),lines:text('lines').notNull(),labor:integer('labor').notNull(),total:integer('total').notNull(),memo:text('memo').notNull()});
export const variants = sqliteTable('variants', {
  id: integer('id').primaryKey(), name: text('name').notNull(),
  category: text('category').notNull(), size: text('size').notNull(), photo: text('photo').notNull(),
});
export const images = sqliteTable('images', {
  id: text('id').primaryKey(), data: text('data').notNull(),
});
export const archivedProducts = sqliteTable('archived_products', {id:integer('id').primaryKey()});
