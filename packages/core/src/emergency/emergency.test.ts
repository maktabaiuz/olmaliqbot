import { renderEmergencyTemplate } from './render';

describe('Emergency Response Engine (Favqulodda Shablonlar)', () => {
  it('should render Level 1 gas leak safety instructions in Uzbek Latin', () => {
    const output = renderEmergencyTemplate('gas_leak', 'lotin', { mahalliy_gaz: '+998 70 612 34 56' });
    expect(output).toContain('🚨 GAZ HIDI — DARHOL:');
    expect(output).toContain('❌ Chiroq, gugurt, zajigalka — yoqmang');
    expect(output).toContain('📞 104 — Gaz avariya xizmati');
    expect(output).toContain('📞 +998 70 612 34 56 — Gaz idorasi');
    expect(output).toContain('Usta emas — avval avariya xizmatini chaqiring.');
  });

  it('should render Level 1 in Russian correctly', () => {
    const output = renderEmergencyTemplate('gas_leak', 'rus', { mahalliy_gaz: '901234567' });
    expect(output).toContain('🚨 ЗАПАХ ГАЗА — СРОЧНО:');
    expect(output).toContain('📞 104 — Аварийная газовая служба');
    expect(output).toContain('📞 901234567 — Горгаз');
  });

  it('should strip missing local numbers completely without artifacts', () => {
    const output = renderEmergencyTemplate('gas_leak', 'lotin', {}); // No local number
    expect(output).not.toContain('{mahalliy_gaz}');
    expect(output).not.toContain('Gaz idorasi');
    expect(output).toContain('📞 104 — Gaz avariya xizmati');
  });

  it('should render Level 2 water pipe with plumber list after official service', () => {
    const output = renderEmergencyTemplate(
      'water_pipe',
      'lotin',
      { mahalliy_suv: '+998 70 615 00 00' },
      'Bahrom ✅ ⭐4.4 — +998 90 123 45 67'
    );
    expect(output).toContain('💧 SUV AVARIYASI');
    expect(output).toContain('📞 +998 70 615 00 00 — Suv ta\'minoti avariya xizmati');
    expect(output).toContain('Bahrom ✅ ⭐4.4 — +998 90 123 45 67');
  });
});
