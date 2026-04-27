import { EuroCents } from '../../common/types/money';
import { SVBeitraege } from '../engines/sozialversicherung.engine';

export interface PayrollResult {
  bruttoEntgeltCents: EuroCents;
  lohnsteuerCents: EuroCents;
  soliCents: EuroCents;
  kirchensteuerCents: EuroCents;
  svBeitraege: SVBeitraege;
  nettoEntgeltCents: EuroCents;
  ytdBruttoCents: EuroCents;
  ytdLohnsteuerCents: EuroCents;
}
