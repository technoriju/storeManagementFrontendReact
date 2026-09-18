const fs = require('fs');
let code = fs.readFileSync('src/features/products/screens/ProductFormScreen.tsx', 'utf8');

// 1. Add new imports
const imports = `import { AppInput } from '../../../shared/components/forms/AppInput';
import { AppSelect } from '../../../shared/components/forms/AppSelect';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { AppRadio } from '../../../shared/components/forms/AppRadio';
import { AppCheckbox } from '../../../shared/components/forms/AppCheckbox';
import { Info, ChevronDown, Image as ImageIcon, Plus, Trash2, Edit, Eye, Minus, Check, Settings, LayoutGrid, ArrowLeft } from 'lucide-react-native';`;
code = code.replace(/import \{ Info, ChevronDown.*lucide-react-native';/, imports);

// 2. Fix FormGroup required
code = code.replace(
  /const FormGroup = \(\{ label, required, children, actionRight, width \}: any\) => \([\s\S]*?\{required && <Text style=\{styles\.required\}>\*<\/Text>\}\n\s*<\/Text>/,
  `const FormGroup = ({ label, children, actionRight, width }: any) => (
  <View style={[styles.formGroup, width ? { width } : null]}>
    <View style={styles.labelRow}>
      <Text style={styles.label}>
        {label}
      </Text>`
);

// 3. Remove ` required` usages
code = code.replace(/ required/g, '');

// 4. Remove InputField / SelectField definitions
code = code.replace(/const SelectField =[\s\S]*?<\/TouchableOpacity>\s*\);\s*/, '');
code = code.replace(/const InputField =[\s\S]*?<\/View>\s*\);\s*/, '');

// 5. Replace SelectField / InputField usages
code = code.replace(/<SelectField placeholder=(["'])(.*?)\1 \/>/g, '<AppSelect placeholder=$1$2$1 containerStyle={{ marginBottom: 0 }} />');
code = code.replace(/<InputField \/>/g, '<AppInput containerStyle={{ marginBottom: 0 }} />');
code = code.replace(/<InputField actionBtn=(["'])(.*?)\1 \/>/g, '<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><View style={{flex: 1}}><AppInput containerStyle={{ marginBottom: 0 }} /></View><AppButton title=$1$2$1 style={{ borderRadius: 6, height: 48 }} /></View>');

// 6. Fix radio group
code = code.replace(/<View style=\{styles\.radioGroup\}>[\s\S]*?<\/View>\n\s*<\/FormGroup>/,
`<View style={styles.radioGroup}>
  <AppRadio label="Single Product" selected={productType === 'single'} onPress={() => setProductType('single')} />
  <AppRadio label="Variable Product" selected={productType === 'variable'} onPress={() => setProductType('variable')} />
</View>
</FormGroup>`);

// 7. Add variants state
const stateBlock = `  const [productType, setProductType] = useState('single');
  const [variants, setVariants] = useState([
    { id: uuidv4(), variation: 'color', value: 'red', sku: '1234', qty: 2, price: '50000' }
  ]);

  const handleAddVariant = () => {
    setVariants([...variants, { id: uuidv4(), variation: '', value: '', sku: '', qty: 1, price: '' }]);
  };

  const handleRemoveVariant = (id) => {
    setVariants(variants.filter(v => v.id !== id));
  };

  const handleUpdateVariant = (id, field, val) => {
    setVariants(variants.map(v => v.id === id ? { ...v, [field]: val } : v));
  };`;
code = code.replace(/  const \[productType, setProductType\] = useState\('single'\);/, stateBlock);

// 8. Add onPress to addVariantBtn
code = code.replace(/<TouchableOpacity style=\{styles\.addVariantBtn\}>/, '<TouchableOpacity style={styles.addVariantBtn} onPress={handleAddVariant}>');

// 9. Update variant map block
const newMapBlock = `{variants.map((item) => (
                  <View style={styles.tableRow} key={item.id}>
                    <View style={[styles.tableCell, {flex: 1.5}]}><AppInput containerStyle={{marginBottom: 0}} value={item.variation} onChangeText={(val) => handleUpdateVariant(item.id, 'variation', val)} /></View>
                    <View style={[styles.tableCell, {flex: 1.5}]}><AppInput containerStyle={{marginBottom: 0}} value={item.value} onChangeText={(val) => handleUpdateVariant(item.id, 'value', val)} /></View>
                    <View style={[styles.tableCell, {flex: 1}]}><AppInput containerStyle={{marginBottom: 0}} value={item.sku} onChangeText={(val) => handleUpdateVariant(item.id, 'sku', val)} /></View>
                    
                    <View style={[styles.tableCell, {flex: 1.2}]}>
                      <View style={styles.qtyControl}>
                        <TouchableOpacity onPress={() => handleUpdateVariant(item.id, 'qty', Math.max(0, item.qty - 1))}>
                          <Minus size={14} color={TEXT_MAIN} />
                        </TouchableOpacity>
                        <Text style={{marginHorizontal: 8}}>{item.qty}</Text>
                        <TouchableOpacity onPress={() => handleUpdateVariant(item.id, 'qty', item.qty + 1)}>
                          <Plus size={14} color={TEXT_MAIN} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    <View style={[styles.tableCell, {flex: 1.5}]}><AppInput containerStyle={{marginBottom: 0}} value={item.price} onChangeText={(val) => handleUpdateVariant(item.id, 'price', val)} /></View>
                    
                    <View style={[styles.tableCell, {flex: 0.8, flexDirection: 'row', justifyContent: 'flex-end', gap: 8}]}>
                      <TouchableOpacity style={styles.iconBoxOutline} onPress={handleAddVariant}><Plus size={14} color={TEXT_MAIN} /></TouchableOpacity>
                      <TouchableOpacity style={styles.iconBoxOutline} onPress={() => handleRemoveVariant(item.id)}><Trash2 size={14} color={TEXT_MAIN} /></TouchableOpacity>
                    </View>
                  </View>
                ))}`;
code = code.replace(/\{\[\s*\{\s*variation[\s\S]*?\)\)\}/, newMapBlock);

// 10. Update EditorField TextInput
code = code.replace(/<TextInput\s+style=\{styles\.editorInput\}\s+multiline\s*\/>/, '<AppInput style={styles.editorInput} multiline={true} containerStyle={{ marginBottom: 0 }} />');

fs.writeFileSync('src/features/products/screens/ProductFormScreen.tsx', code);
