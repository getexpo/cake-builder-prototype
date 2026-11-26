// Common makes and models sold in Canada. "Other" lets drivers type anything not listed.
export const VEHICLES = {
  Acura: ['ILX', 'Integra', 'TLX', 'RDX', 'MDX', 'ZDX'],
  Audi: ['A3', 'A4', 'A5', 'A6', 'Q3', 'Q4 e-tron', 'Q5', 'Q7', 'Q8', 'e-tron'],
  BMW: ['2 Series', '3 Series', '4 Series', '5 Series', 'X1', 'X3', 'X5', 'X7', 'i4', 'iX'],
  Buick: ['Encore', 'Encore GX', 'Envision', 'Enclave'],
  Cadillac: ['CT4', 'CT5', 'XT4', 'XT5', 'XT6', 'Escalade', 'Lyriq'],
  Chevrolet: ['Spark', 'Malibu', 'Bolt EV', 'Bolt EUV', 'Trax', 'Trailblazer', 'Equinox', 'Blazer', 'Traverse', 'Tahoe', 'Suburban', 'Colorado', 'Silverado', 'Express'],
  Chrysler: ['300', 'Pacifica', 'Grand Caravan'],
  Dodge: ['Charger', 'Challenger', 'Durango', 'Hornet', 'Grand Caravan'],
  Ford: ['Fiesta', 'Focus', 'Fusion', 'Mustang', 'Mustang Mach-E', 'EcoSport', 'Escape', 'Bronco Sport', 'Bronco', 'Edge', 'Explorer', 'Expedition', 'Maverick', 'Ranger', 'F-150', 'F-150 Lightning', 'Transit', 'Transit Connect'],
  Genesis: ['G70', 'G80', 'GV60', 'GV70', 'GV80'],
  GMC: ['Terrain', 'Acadia', 'Yukon', 'Canyon', 'Sierra', 'Savana'],
  Honda: ['Civic', 'Accord', 'Insight', 'Fit', 'HR-V', 'CR-V', 'Passport', 'Pilot', 'Odyssey', 'Ridgeline'],
  Hyundai: ['Accent', 'Elantra', 'Sonata', 'Ioniq', 'Ioniq 5', 'Ioniq 6', 'Venue', 'Kona', 'Tucson', 'Santa Fe', 'Palisade', 'Santa Cruz'],
  Infiniti: ['Q50', 'QX50', 'QX55', 'QX60', 'QX80'],
  Jaguar: ['XF', 'E-Pace', 'F-Pace', 'I-Pace'],
  Jeep: ['Renegade', 'Compass', 'Cherokee', 'Grand Cherokee', 'Wrangler', 'Gladiator', 'Wagoneer'],
  Kia: ['Rio', 'Forte', 'K5', 'Soul', 'Niro', 'Seltos', 'Sportage', 'Sorento', 'Telluride', 'Carnival', 'EV6', 'EV9'],
  'Land Rover': ['Defender', 'Discovery', 'Discovery Sport', 'Range Rover', 'Range Rover Evoque', 'Range Rover Sport', 'Range Rover Velar'],
  Lexus: ['IS', 'ES', 'UX', 'NX', 'RX', 'GX', 'TX', 'RZ'],
  Lincoln: ['Corsair', 'Nautilus', 'Aviator', 'Navigator'],
  Mazda: ['Mazda3', 'Mazda6', 'CX-3', 'CX-30', 'CX-5', 'CX-50', 'CX-70', 'CX-9', 'CX-90', 'MX-30'],
  'Mercedes-Benz': ['A-Class', 'C-Class', 'E-Class', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'EQB', 'EQE', 'Metris', 'Sprinter'],
  MINI: ['Cooper', 'Clubman', 'Countryman'],
  Mitsubishi: ['Mirage', 'RVR', 'Eclipse Cross', 'Outlander', 'Outlander PHEV'],
  Nissan: ['Versa', 'Sentra', 'Altima', 'Leaf', 'Kicks', 'Qashqai', 'Rogue', 'Murano', 'Pathfinder', 'Armada', 'Ariya', 'Frontier', 'Titan', 'NV200'],
  Polestar: ['2', '3'],
  Porsche: ['Macan', 'Cayenne', 'Taycan', 'Panamera'],
  Ram: ['1500', '2500', 'ProMaster', 'ProMaster City'],
  Rivian: ['R1S', 'R1T'],
  Subaru: ['Impreza', 'Legacy', 'WRX', 'Crosstrek', 'Forester', 'Outback', 'Ascent', 'Solterra'],
  Tesla: ['Model 3', 'Model Y', 'Model S', 'Model X', 'Cybertruck'],
  Toyota: ['Corolla', 'Corolla Cross', 'Camry', 'Prius', 'GR86', 'C-HR', 'RAV4', 'Venza', 'Highlander', 'Grand Highlander', '4Runner', 'Sequoia', 'Sienna', 'Tacoma', 'Tundra', 'bZ4X'],
  Volkswagen: ['Jetta', 'Golf', 'GTI', 'Passat', 'Taos', 'Tiguan', 'Atlas', 'Atlas Cross Sport', 'ID.4'],
  Volvo: ['S60', 'S90', 'V60', 'XC40', 'XC60', 'XC90', 'C40', 'EX30'],
}
export const MAKES = Object.keys(VEHICLES)

// "Toyota RAV4" → { make: 'Toyota', model: 'RAV4' }; anything unknown becomes Other.
export function splitVehicle(text) {
  const value = String(text || '').trim()
  if (!value) return { make: '', model: '', otherMake: '', otherModel: '' }
  const make = [...MAKES].sort((a, b) => b.length - a.length).find((name) => value.toLowerCase().startsWith(name.toLowerCase()))
  if (!make) return { make: 'Other', model: '', otherMake: value, otherModel: '' }
  const rest = value.slice(make.length).trim()
  const model = VEHICLES[make].find((name) => name.toLowerCase() === rest.toLowerCase())
  return model ? { make, model, otherMake: '', otherModel: '' } : { make, model: rest ? 'Other' : '', otherMake: '', otherModel: rest }
}

export function joinVehicle({ make, model, otherMake, otherModel }) {
  const m = make === 'Other' ? String(otherMake || '').trim() : make
  const md = make === 'Other' || model === 'Other' ? String(otherModel || '').trim() : model
  return [m, md].filter(Boolean).join(' ')
}
