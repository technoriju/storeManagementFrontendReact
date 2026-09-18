const fs = require('fs');
let code = fs.readFileSync('ProductFormScreen.tsx', 'utf8');

// Add variants state
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
code = code.replace(/const \[productType, setProductType\] = useState\('single'\);/, stateBlock);

// Replace add button onPress
code = code.replace(/<TouchableOpacity style=\{styles\.addVariantBtn\}>/, '<TouchableOpacity style={styles.addVariantBtn} onPress={handleAddVariant}>');

// Replace mapping array and row contents
const oldMapBlock = `{[
                  { variation: 'color', value: 'red', sku: '1234', qty: 2, price: '50000' },
                  { variation: 'color', value: 'black', sku: '2345', qty: 3, price: '50000' }
                ].map((item, idx) => (
                  <View style={styles.tableRow} key={idx}>
                    <View style={[styles.tableCell, {flex: 1.5}]}><TextInput style={styles.tableInput} value={item.variation} /></View>
                    <View style={[styles.tableCell, {flex: 1.5}]}><TextInput style={styles.tableInput} value={item.value} /></View>
                    <View style={[styles.tableCell, {flex: 1}]}><TextInput style={styles.tableInput} value={item.sku} /></View>
                    
                    <View style={[styles.tableCell, {flex: 1.2}]}>
                      <View style={styles.qtyControl}>
                        <Minus size={14} color={TEXT_MAIN} />
                        <Text style={{marginHorizontal: 8}}>{item.qty}</Text>
                        <Plus size={14} color={TEXT_MAIN} />
                      </View>
                    </View>
                    
                    <View style={[styles.tableCell, {flex: 1.5}]}><TextInput style={styles.tableInput} value={item.price} /></View>
                    
                    <View style={[styles.tableCell, {flex: 0.8, flexDirection: 'row', justifyContent: 'flex-end', gap: 8}]}>
                      <View style={styles.iconBoxPrimary}><Check size={14} color="white" /></View>
                      <View style={styles.iconBoxOutline}><Plus size={14} color={TEXT_MAIN} /></View>
                      <View style={styles.iconBoxOutline}><Trash2 size={14} color={TEXT_MAIN} /></View>
                    </View>
                  </View>
                ))}`;

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

// I will use regex because whitespace might mismatch
code = code.replace(/\{\[\s*\{\s*variation[\s\S]*?\)\)\}/, newMapBlock);

fs.writeFileSync('ProductFormScreen.tsx', code);
