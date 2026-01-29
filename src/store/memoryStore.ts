import { Doctor, TimeSlot, Token } from '../types/domain';

/**
 * In-memory data store
 * In production, this would be replaced with PostgreSQL + Redis
 */
class MemoryStore {
  private doctors: Map<string, Doctor> = new Map();
  private slots: Map<string, TimeSlot> = new Map();
  private tokens: Map<string, Token> = new Map();

  // Doctor operations
  addDoctor(doctor: Doctor): void {
    this.doctors.set(doctor.id, doctor);
  }

  getDoctor(id: string): Doctor | undefined {
    return this.doctors.get(id);
  }

  getAllDoctors(): Doctor[] {
    return Array.from(this.doctors.values());
  }

  // Slot operations
  addSlot(slot: TimeSlot): void {
    this.slots.set(slot.id, slot);
  }

  getSlot(id: string): TimeSlot | undefined {
    return this.slots.get(id);
  }

  updateSlot(id: string, updates: Partial<TimeSlot>): void {
    const slot = this.slots.get(id);
    if (slot) {
      this.slots.set(id, { ...slot, ...updates });
    }
  }

  getSlotsByDoctor(doctorId: string): TimeSlot[] {
    return Array.from(this.slots.values()).filter(
      (slot) => slot.doctorId === doctorId
    );
  }

  getAllSlots(): TimeSlot[] {
    return Array.from(this.slots.values());
  }

  // Token operations
  addToken(token: Token): void {
    this.tokens.set(token.id, token);
  }

  getToken(id: string): Token | undefined {
    return this.tokens.get(id);
  }

  updateToken(id: string, updates: Partial<Token>): void {
    const token = this.tokens.get(id);
    if (token) {
      this.tokens.set(id, { ...token, ...updates });
    }
  }

  deleteToken(id: string): void {
    this.tokens.delete(id);
  }

  getAllTokens(): Token[] {
    return Array.from(this.tokens.values());
  }

  getTokensBySlot(slotId: string): Token[] {
    return Array.from(this.tokens.values()).filter(
      (token) => token.slotId === slotId
    );
  }

  // Utility: Clear all data (useful for testing/simulation reset)
  clear(): void {
    this.doctors.clear();
    this.slots.clear();
    this.tokens.clear();
  }

  // Get stats
  getStats() {
    return {
      totalDoctors: this.doctors.size,
      totalSlots: this.slots.size,
      totalTokens: this.tokens.size,
    };
  }
}

// Singleton instance
export const store = new MemoryStore();