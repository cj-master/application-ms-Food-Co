import { Preferences, User, UserDocument } from '../entities/entities';
import { RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { CompleteOnboardingDto } from '../dtos/dtos';
import { CategoriaComidaEnum } from 'src/modules/restaurant/enum/enum';

// ─── Catálogo de opciones válidas ─────────────────────────────────────────────
// Centralizado aquí para que el frontend pueda pedirlo via GET /preferences/catalog
// y pintarlo en el onboarding sin hardcodearlo en la app

export const PREFERENCES_CATALOG = {
  cuisineTypes: [
    CategoriaComidaEnum.MEXICANA,
    CategoriaComidaEnum.MEXICANA,
    CategoriaComidaEnum.ITALIANA,
    CategoriaComidaEnum.JAPONESA,
    CategoriaComidaEnum.AMERICANA,
    CategoriaComidaEnum.TAILANDESA,
    CategoriaComidaEnum.INDIA,
    CategoriaComidaEnum.MEDITERRANEA,
    CategoriaComidaEnum.FRANCESA,
    CategoriaComidaEnum.COREANA,
    CategoriaComidaEnum.PERUANA,
  ],
  foodCategories: [
    'mariscos', 'carnes', 'pastas', 'pizzas', 'sushi',
    'tacos', 'hamburguesas', 'postres', 'panadería', 'helados',
    'ensaladas', 'sopas', 'desayunos', 'brunch', 'bebidas',
  ],
  diningStyle: [
    'casual', 'fine dining', 'street food', 'fast food',
    'buffet', 'brunch', 'food truck', 'bar', 'cafetería',
    'delivery', 'para llevar',
  ],
  priceRange: ['$', '$$', '$$$'],
  dietaryRestrictions: [
    'vegano', 'vegetariano', 'sin gluten', 'sin lactosa',
    'sin mariscos', 'halal', 'kosher', 'sin nueces',
    'sin cerdo', 'bajo en calorías',
  ],
} as const;

// Tipo derivado del catálogo
type CatalogKey = keyof typeof PREFERENCES_CATALOG;

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface UpdatePreferencesPayload {
  cuisineTypes?: string[];
  foodCategories?: string[];
  diningStyle?: string[];
  priceRange?: string[];
  dietaryRestrictions?: string[];
}

@Injectable()
export class PreferencesService {

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) { }

  // ── Catálogo ───────────────────────────────────────────────────────────────
  getCatalog() {
    return PREFERENCES_CATALOG;
  }

  // ── Leer preferencias de un usuario ───────────────────────────────────────
  async getPreferences(userId: string): Promise<Preferences> {
    const user = await this.userModel
      .findById(userId)
      .select('preferences onboardingCompleted')
      .lean()
      .exec();

    if (!user) throw new RpcException({ message: 'Usuario no encontrado', status: 404 });
    return user.preferences;
  }

  // ── Actualizar preferencias (merge — no reemplaza todo) ────────────────────
  async updatePreferences(userId: string, payload: UpdatePreferencesPayload): Promise<Preferences> {
    // Validar que los valores enviados existen en el catálogo
    this.validateAgainstCatalog(payload);

    // Construir el objeto $set solo con los campos que llegaron
    const setFields: Record<string, any> = {};
    for (const [key, values] of Object.entries(payload)) {
      if (values !== undefined) {
        setFields[`preferences.${key}`] = values;
      }
    }

    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: setFields },
      { new: true, select: 'preferences onboardingCompleted' },
    ).exec();

    if (!user) throw new RpcException({ message: 'Usuario no encontrado', status: 404 });
    return user.preferences;
  }

  // ── Completar onboarding ───────────────────────────────────────────────────
  // Se llama cuando el usuario termina el flujo inicial de selección de gustos.
  // Requiere al menos una opción en cuisineTypes o foodCategories.

  async completeOnboarding(completeOnboardingDto: CompleteOnboardingDto) {
    try {
      const { userId, ...payload } = completeOnboardingDto
      this.validateAgainstCatalog(payload);

      const hasMeaningfulSelection = (payload.cuisineTypes?.length ?? 0) > 0 || (payload.foodCategories?.length ?? 0) > 0;

      if (!hasMeaningfulSelection)
        throw new RpcException({ message: 'Selecciona al menos un tipo de cocina o categoría de comida para continuar.', status: 400 })

      const setFields: Record<string, any> = { onboardingCompleted: true };
      for (const [key, values] of Object.entries(payload)) {
        if (values !== undefined) {
          setFields[`preferences.${key}`] = values;
        }
      }

      await this.userModel.findByIdAndUpdate(userId, { $set: setFields });
      return ({ message: 'Se completo onboarding' })
    } catch (error) {
      this.handleException(error);
    }
  }

  // ── Agregar / quitar un valor individual ──────────────────────────────────
  // Útil cuando el usuario toca un chip en la UI sin reenviar todo el array
  async addPreferenceValue(userId: string, category: CatalogKey, value: string) {
    this.assertValueInCatalog(category, value);

    await this.userModel.findByIdAndUpdate(userId, {
      $addToSet: { [`preferences.${category}`]: value },
    });

    return ({ message: 'Valor agregado' })
  }

  async removePreferenceValue(userId: string, category: CatalogKey, value: string) {
    await this.userModel.findByIdAndUpdate(userId, {
      $pull: { [`preferences.${category}`]: value },
    });

    return ({ message: 'Valor removido' })
  }

  // ─── Helpers privados ──────────────────────────────────────────────────────
  private validateAgainstCatalog(payload: UpdatePreferencesPayload): void {
    for (const [key, values] of Object.entries(payload)) {
      if (!values) continue;

      const catalogKey = key as CatalogKey;
      if (!(catalogKey in PREFERENCES_CATALOG)) throw new RpcException({ message: `Categoría inválida: ${key}`, status: 400 });

      const validOptions = PREFERENCES_CATALOG[catalogKey] as readonly string[];
      const invalid = values.filter((v) => !validOptions.includes(v));

      if (invalid.length > 0) throw new RpcException({ message: `Valores inválidos en ${key}: ${invalid.join(', ')}`, status: 400 })
    }
  }

  private assertValueInCatalog(category: CatalogKey, value: string): void {
    const validOptions = PREFERENCES_CATALOG[category] as readonly string[];
    if (!validOptions.includes(value)) {
      throw new RpcException({ message: `Valor inválido: "${value}" en ${category}`, status: 400 });
    }
  }

  // -- Manejar los errores --
  private handleException(error: any) {
    console.log(error);
    const customError = error.error
    if (customError) throw new RpcException({ status: customError.status, message: customError.message })

    throw new RpcException({ status: 500, message: 'Error en el servidor de "PAGINA"' })
  }
}