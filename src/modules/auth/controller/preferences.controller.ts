import { MessagePattern, Payload } from '@nestjs/microservices';
import { PreferencesService } from '../services/services';
import { Controller } from '@nestjs/common';
import { CompleteOnboardingDto } from '../dtos/dtos';

@Controller()
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) { }

  // ── Catálogo ───────────────────────────────────────────────────────────────
  @MessagePattern('preferences.catalog')
  getCatalog() {
    // Sin payload — devuelve el catálogo completo de opciones válidas
    // El frontend lo usa para pintar el onboarding y la pantalla de edición
    return this.preferencesService.getCatalog();
  }

  // ── Leer preferencias ──────────────────────────────────────────────────────
  @MessagePattern('preferences.get')
  getPreferences(@Payload() payload: { userId: string }) {
    return this.preferencesService.getPreferences(payload.userId);
  }

  // ── Actualizar preferencias (reemplaza los arrays completos) ───────────────
  @MessagePattern('preferences.update')
  updatePreferences(
    @Payload()
    payload: {
      userId: string;
      cuisineTypes?: string[];
      foodCategories?: string[];
      diningStyle?: string[];
      priceRange?: string[];
      dietaryRestrictions?: string[];
    },
  ) {
    const { userId, ...data } = payload;
    return this.preferencesService.updatePreferences(userId, data);
  }

  // ── Onboarding ─────────────────────────────────────────────────────────────

  // Marca onboardingCompleted: true en el User
  @MessagePattern('preferences.onboarding.complete')
  completeOnboarding(
    @Payload() completeOnboardingDto: CompleteOnboardingDto) {
    return this.preferencesService.completeOnboarding(completeOnboardingDto);
  }

  // ── Toggle individual de un valor (para chips en la UI) ────────────────────
  @MessagePattern('preferences.value.add')
  addValue(@Payload() payload: { userId: string; category: string; value: string; }) {
    return this.preferencesService.addPreferenceValue(
      payload.userId,
      payload.category as any,
      payload.value,
    );
  }

  @MessagePattern('preferences.value.remove')
  removeValue(@Payload() payload: { userId: string; category: string; value: string; }) {
    return this.preferencesService.removePreferenceValue(
      payload.userId,
      payload.category as any,
      payload.value,
    );
  }
}