import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';
import {
  RestaurantStatusEnum,
  PriceRangeEnum,
  DressCodeEnum,
  CategoriaComidaEnum,
  SubcategoriaComidaEnum,
  PaymentOptionsEnum,
  IdiomaServicioEnum,
  RestaurantAwardEnum,
  MenuTypeEnum,
  RestaurantFeatureEnum,
} from '../enum/enum';

@Schema({ _id: false })
export class GeoPoint {

  @Prop({ type: String, enum: ['Point'], required: true, default: 'Point' })
  type: 'Point';

  @Prop({
    type: [Number],
    required: true,
    validate: {
      validator: (v: number[]) => v.length === 2,
      message: 'Coordinates must be [longitude, latitude]',
    },
  })
  coordinates: [number, number];
}

export const GeoPointSchema = SchemaFactory.createForClass(GeoPoint);

// ─── Sub-document: Address ────────────────────────────────────────────────────
@Schema({ _id: false })
export class Address {
  @Prop({ required: true, trim: true, type: String })
  name: string;

  @Prop({ trim: true, type: String })
  city: string;

  @Prop({ type: Number })
  zipCode: number;

  @Prop({ trim: true, type: String })
  state: string;

  @Prop({ trim: true, type: String })
  country: string;

  @Prop({ type: GeoPointSchema, default: null })
  geoPoint: GeoPoint | null;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

// ─── Sub-document: Award ──────────────────────────────────────────────────────
@Schema({ _id: false })
export class Award {
  @Prop({ required: true, enum: RestaurantAwardEnum })
  name: RestaurantAwardEnum;

  @Prop({ default: null })
  year: number | null;

  @Prop({ default: null, trim: true })
  organization: string | null;

  @Prop({ default: null, trim: true, maxlength: 200 })
  description: string | null;

  @Prop({ default: null })
  iconUrl: string | null;
}

export const AwardSchema = SchemaFactory.createForClass(Award);

// ─── Sub-document: AboutItem ──────────────────────────────────────────────────
@Schema({ _id: false })
export class AboutItem {
  @Prop({ maxlength: 100 })
  title: string;

  @Prop({ maxlength: 500 })
  description: string;
}

export const AboutItemSchema = SchemaFactory.createForClass(AboutItem);

// ─── Sub-document: ScheduleDay ────────────────────────────────────────────────
@Schema({ _id: false })
export class ScheduleDay {
  @Prop({
    required: true,
    enum: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'],
  })
  day: string;

  @Prop({ required: true, match: /^([01]\d|2[0-3]):([0-5]\d)$/ })
  open: string;                 // formato HH:mm, ej: "13:00"

  @Prop({ required: true, match: /^([01]\d|2[0-3]):([0-5]\d)$/ })
  close: string;                // formato HH:mm, ej: "23:30"

  @Prop({ default: false })
  closed: boolean;              // true si ese día no abre
}

export const ScheduleDaySchema = SchemaFactory.createForClass(ScheduleDay);

// ─── Sub-document: ReservationOptions ────────────────────────────────────────
@Schema({ _id: false })
export class ReservationOptions {
  @Prop({ default: false })
  available: boolean;

  @Prop({ default: null })
  url: string | null;           // link a OpenTable, Resy, etc.

  @Prop({ default: null })
  phone: string | null;

  @Prop({ default: null })
  email: string | null;
}

export const ReservationOptionsSchema = SchemaFactory.createForClass(ReservationOptions);

// ─── Sub-document: Contact ────────────────────────────────────────────────────
@Schema({ _id: false })
export class Contact {
  @Prop({ default: null })
  phone: string | null;         // string en vez de number para manejar +52, extensiones, etc.

  @Prop({ default: null })
  email: string | null;

  @Prop({ default: null })
  website: string | null;

  @Prop({ default: null })
  instagram: string | null;

  @Prop({ default: null })
  facebook: string | null;

  @Prop({ default: null })
  whatsapp: string | null;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);

// ─── Sub-document: RestaurantImage ───────────────────────────────────────────
// Tipo del subdocumento hydratado
export type RestaurantImageDocument = HydratedDocument<RestaurantImage>;

@Schema({ _id: true })
export class RestaurantImage {
  @Prop({ required: true, select: false })
  key: string;              // key base en R2 — las variantes se derivan con buildVariantKey

  @Prop({ default: null })
  blurHash: string | null;

  @Prop({ default: null })
  caption: string | null;

  @Prop({ default: null })
  uploadedBy: string | null;

  @Prop({ default: 0 })
  order: number;
}

export const RestaurantImageSchema = SchemaFactory.createForClass(RestaurantImage);

// ─── Sub-document: MenuItem ───────────────────────────────────────────────────
@Schema({ _id: true })
export class MenuItem {
  @Prop({ required: true, trim: true, maxlength: 100 })
  name: string;

  @Prop({ default: null, maxlength: 300 })
  description: string | null;

  @Prop({ default: null })
  price: number | null;

  @Prop({ default: null })
  imageUrl: string | null;

  @Prop({ type: [String], default: [] })
  tags: string[];               // 'vegetariano', 'sin gluten', 'picante', etc.
}

export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);

// ─── Sub-document: MenuSection ────────────────────────────────────────────────
@Schema({ _id: true })
export class MenuSection {
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 80 })
  title: string;                // ej: "Entradas", "Platos fuertes", "Postres"

  @Prop({ type: [MenuItemSchema], default: [] })
  items: MenuItem[];
}

export const MenuSectionSchema = SchemaFactory.createForClass(MenuSection);

// ─── Sub-document: Menu ───────────────────────────────────────────────────────
@Schema({ _id: false })
export class Menu {
  @Prop({ required: true, enum: MenuTypeEnum })
  type: MenuTypeEnum;           // 'link' | 'structured'

  // Opción A — URL externa o PDF
  @Prop({ default: null })
  url: string | null;           // https://restaurante.com/menu o link a PDF en R2

  // Opción B — estructura de secciones
  @Prop({ type: [MenuSectionSchema], default: [] })
  sections: MenuSection[];
}

export const MenuSchema = SchemaFactory.createForClass(Menu);


// ─── Main Schema: Restaurant ──────────────────────────────────────────────────
// Tipo del documento principal
export type RestaurantDocument = HydratedDocument<Restaurant> & {
  gallery: Types.DocumentArray<RestaurantImageDocument>;
};

@Schema({
  timestamps: true,
  collection: 'restaurants',
})
export class Restaurant extends Document {

  // ── Identidad ──────────────────────────────────────────────────────────────
  @Prop({ required: true, trim: true, index: true })
  name: string;

  @Prop({
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[a-z0-9-]+$/,     // ej: "pujol-cdmx" — para URLs limpias
  })
  slug: string;

  @Prop({ default: null, maxlength: 500 })
  description: string | null;

  @Prop({ type: [AboutItemSchema], default: [] })
  about: AboutItem[];           // secciones "Nuestra historia", "El chef", etc.

  // ── Media ──────────────────────────────────────────────────────────────────
  // En Restaurant schema
  @Prop({ default: null, select: false })
  logoKey: string | null;       // key base en R2

  @Prop({ default: null, select: false })
  coverKey: string | null;      // key base en R2

  @Prop({ type: [RestaurantImageSchema], default: [] })
  gallery: Types.DocumentArray<RestaurantImageDocument>;

  // ── Ubicación ──────────────────────────────────────────────────────────────
  @Prop({ type: AddressSchema, required: true })
  address: Address;

  // ── Clasificación ──────────────────────────────────────────────────────────
  @Prop({ required: true, enum: CategoriaComidaEnum, index: true })
  category: CategoriaComidaEnum;

  @Prop({ type: [String], enum: SubcategoriaComidaEnum, default: [], index: true })
  subCategories: SubcategoriaComidaEnum[];

  @Prop({ type: Number, enum: PriceRangeEnum, default: null })
  priceRange: PriceRangeEnum | null;   // 1=$  2=$$  3=$$$  4=$$$$

  @Prop({ enum: DressCodeEnum, default: null })
  dressCode: DressCodeEnum | null;

  // ── Equipo ─────────────────────────────────────────────────────────────────
  @Prop({ default: null, trim: true, index: true })
  chef: string | null;

  // ── Información práctica ───────────────────────────────────────────────────
  @Prop({ type: [ScheduleDaySchema], default: [] })
  schedule: ScheduleDay[];

  @Prop({ type: ReservationOptionsSchema, default: () => ({}) })
  reservationOptions: ReservationOptions;

  @Prop({ type: [String], enum: PaymentOptionsEnum, default: [] })
  paymentOptions: PaymentOptionsEnum[];

  @Prop({ type: [String], enum: IdiomaServicioEnum, default: [] })
  languagesSpoken: IdiomaServicioEnum[];

  @Prop({ type: [String], enum: RestaurantFeatureEnum, default: [], index: true })
  features: RestaurantFeatureEnum[];
  // Solo se agregan las features que el restaurante tiene disponibles
  // ej: ['delivery', 'wifi', 'outdoor_seating', 'vegan_options']

  // ── Menú ───────────────────────────────────────────────────────────────────
  @Prop({ default: false })
  hasMenu: boolean;

  @Prop({ type: MenuSchema, default: null })
  menu: Menu | null;

  // ── Contacto y redes ───────────────────────────────────────────────────────
  @Prop({ type: ContactSchema, default: () => ({}) })
  contact: Contact;

  // ── Premios ────────────────────────────────────────────────────────────────
  @Prop({ type: [AwardSchema], default: [] })
  awards: Award[];

  // ── Contadores denormalizados ──────────────────────────────────────────────
  @Prop({ default: 0, min: 0 })
  followersCount: number;       // usuarios que lo guardaron / siguen

  @Prop({ default: 0, min: 0 })
  postsCount: number;           // posts de la comunidad que lo tagguean

  @Prop({ default: 0, min: 0 })
  savedCount: number;           // cuántas veces fue guardado

  // ── Rating ─────────────────────────────────────────────────────────────────
  // En el MVP no hay reviews propias — se puede integrar Google Places después
  @Prop({ default: null, min: 0, max: 5 })
  rating: number | null;

  @Prop({ default: 0 })
  reviewCount: number;

  // ── Estado ─────────────────────────────────────────────────────────────────
  @Prop({ type: String, enum: RestaurantStatusEnum, default: RestaurantStatusEnum.DRAFT, index: true })
  status: RestaurantStatusEnum;
}

export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);

// ─── Índices ──────────────────────────────────────────────────────────────────

// Búsqueda por categoría y estado
RestaurantSchema.index({ category: 1, status: 1 });
RestaurantSchema.index({ subCategories: 1, status: 1 });

// Filtros combinados más comunes desde el feed
RestaurantSchema.index({ priceRange: 1, status: 1 });
RestaurantSchema.index({ features: 1, status: 1 });

// Geoespacial — "restaurantes cerca de mí"
RestaurantSchema.index({ 'location.geoPoint': '2dsphere' });

// Búsqueda de texto
RestaurantSchema.index(
  { name: 'text', description: 'text', chef: 'text' },
  { weights: { name: 4, chef: 2, description: 1 } },
);

// ─── toJSON ───────────────────────────────────────────────────────────────────
RestaurantSchema.set('toJSON', {
  virtuals: true,
  transform: (_: any, ret: Record<string, any>) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;

    // Eliminar keys de R2 — nunca salen al cliente
    delete ret.logoKey;
    delete ret.coverKey;

    if (ret.gallery) {
      ret.gallery = ret.gallery.map((img: any) => {
        delete img.key;
        return img;
      });
    }

    return ret;
  },
});