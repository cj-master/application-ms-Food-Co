import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';
import { ImageUploadStatusEnum, PostStatusEnum } from '../enum/enum';

// ─── Sub-document: PostImage ──────────────────────────────────────────────────
// Cada item del carrusel es un documento embebido con su propia URL y metadata

@Schema({ _id: true })   // _id: true para poder referenciar cada imagen individualmente
export class PostImage {
  _id: Types.ObjectId;

  @Prop({ required: true })
  url: string;              // URL pública en Cloudflare R2 (CDN)

  @Prop({ required: true })
  key: string;              // key en R2, ej: "posts/userId/uuid.jpg"
  // necesario para poder eliminar la imagen de R2 luego

  @Prop({ default: null })
  width: number | null;     // dimensiones originales — útil para el layout del carrusel
  // en la app sin hacer un request extra

  @Prop({ default: null })
  height: number | null;

  @Prop({ default: null })
  blurHash: string | null;  // placeholder borroso mientras carga la imagen real
  // se genera en el cliente antes del upload

  @Prop({
    type: String,
    enum: ImageUploadStatusEnum,
    default: ImageUploadStatusEnum.PENDING,
  })
  uploadStatus: ImageUploadStatusEnum;

  @Prop({ type: Number, required: true })
  order: number;            // 0-indexed — define el orden en el carrusel
}

// ─── Sub-document: PostLocation ───────────────────────────────────────────────
export const PostImageSchema = SchemaFactory.createForClass(PostImage);

@Schema({ _id: false })
export class PostLocation {
  @Prop({ required: true })
  name: string;             // nombre legible, ej: "Ciudad de México"

  @Prop({
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number] },  // [longitude, latitude]
  })
  geoPoint?: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export const PostLocationSchema = SchemaFactory.createForClass(PostLocation);

// ─── Main Schema: Post ────────────────────────────────────────────────────────

export type PostDocument = HydratedDocument<Post>;

@Schema({
  timestamps: true,
  collection: 'posts',
})
export class Post extends Document {
  // ── Autoría ────────────────────────────────────────────────────────────────
  @Prop({ type: Types.ObjectId, required: true, index: true })
  authorId: Types.ObjectId;       // ref al User Service — no hacemos populate cross-service

  // ── Imágenes ───────────────────────────────────────────────────────────────
  @Prop({ type: [PostImageSchema], default: [] })
  images: PostImage[];            // máximo 5, mínimo 1 al publicar
  // ordenadas por `order` asc

  // ── Contenido ──────────────────────────────────────────────────────────────
  @Prop({ default: null, maxlength: 500 })
  caption: string | null;         // descripción del post

  @Prop({ type: [String], default: [] })
  ingredients: string[];          // ['tomate', 'albahaca', 'mozzarella']

  @Prop({ default: null, maxlength: 100 })
  dishName: string | null;        // nombre del platillo, ej: "Pizza Margherita"

  @Prop({ default: null })
  cuisineType: string | null;     // 'italiana' — del mismo catálogo de Preferences

  @Prop({ type: [String], default: [], index: true })
  tags: string[];                 // ['#pizza', '#italiana', '#casera']

  // ── Restaurante (opcional) ─────────────────────────────────────────────────
  @Prop({ type: Types.ObjectId, default: null, index: true })
  restaurantId: Types.ObjectId | null;  // ref al Restaurant Service
  // null si es comida casera

  // ── Contadores denormalizados ──────────────────────────────────────────────
  @Prop({ default: 0, min: 0 })
  likesCount: number;

  @Prop({ default: 0, min: 0 })
  commentsCount: number;

  @Prop({ default: 0, min: 0 })
  savedCount: number;             // cuántas veces fue guardado por usuarios

  // ── Ubicación ─────────────────────────────────────────────────────────────
  @Prop({ type: PostLocationSchema, default: null })
  location: PostLocation | null;

  // ── Estado ────────────────────────────────────────────────────────────────
  @Prop({
    type: String,
    enum: PostStatusEnum,
    default: PostStatusEnum.DRAFT,  // empieza como draft hasta confirmar el upload
    index: true,
  })
  status: PostStatusEnum;
}

export const PostSchema = SchemaFactory.createForClass(Post);

// ─── Índices ──────────────────────────────────────────────────────────────────

// Grid de perfil: posts activos de un autor, ordenados por más reciente
PostSchema.index({ authorId: 1, status: 1, createdAt: -1 });

// Feed: posts activos recientes (base para el algoritmo)
PostSchema.index({ status: 1, createdAt: -1 });

// Posts de un restaurante
PostSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });

// Búsqueda por tags
PostSchema.index({ tags: 1, status: 1 });

// Full-text sobre dishName, caption e ingredients
PostSchema.index(
  { dishName: 'text', caption: 'text', ingredients: 'text', tags: 'text' },
  { weights: { dishName: 4, tags: 3, ingredients: 2, caption: 1 } },
);

// Geoespacial para "posts cerca de mí" (fase 2)
PostSchema.index({ 'location.geoPoint': '2dsphere' });

// ─── toJSON ───────────────────────────────────────────────────────────────────

PostSchema.set('toJSON', {
  virtuals: true,
  transform: (_: any, ret: Record<string, any>) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    // Limpiar keys de R2 — son internos, el cliente solo necesita las URLs
    if (ret.images) {
      ret.images = ret.images.map((img: any) => {
        delete img.key;
        return img;
      });
    }
    return ret;
  },
});