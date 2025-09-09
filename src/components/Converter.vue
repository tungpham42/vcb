<template>
  <a-card title="Vietcombank Exchange Converter">
    <div style="display: flex; gap: 12px; flex-wrap: wrap">
      <a-input-number v-model:value="amount" :min="0" style="width: 150px" />

      <a-select v-model:value="from" style="width: 120px">
        <a-select-option v-for="c in currencies" :key="c" :value="c">{{
          c
        }}</a-select-option>
      </a-select>

      <span style="align-self: center">→</span>

      <a-select v-model:value="to" style="width: 120px">
        <a-select-option v-for="c in currencies" :key="c" :value="c">{{
          c
        }}</a-select-option>
      </a-select>

      <a-select v-model:value="rateMode" style="width: 160px">
        <a-select-option value="Transfer"
          >Tỉ giá (Chuyển khoản)</a-select-option
        >
        <a-select-option value="Buy">Mua vào</a-select-option>
        <a-select-option value="Sell">Bán ra</a-select-option>
      </a-select>

      <a-button type="primary" @click="convert">Chuyển</a-button>
      <a-button @click="reload">Tải lại</a-button>
    </div>

    <div style="margin-top: 16px">
      <a-skeleton :loading="loading">
        <div v-if="result !== null">
          <h3>Kết quả: {{ formattedResult }}</h3>
          <p>Rate used: {{ usedRateText }}</p>
        </div>
        <div v-else>
          <p>Nhập giá trị và chọn tiền tệ rồi nhấn Chuyển.</p>
        </div>
      </a-skeleton>
    </div>

    <a-divider />

    <div>
      <a-space direction="vertical">
        <div style="display: flex; gap: 12px; align-items: center">
          <strong>Thời điểm cập nhật:</strong>
          <span>{{ lastUpdatedText }}</span>
        </div>
        <a-table
          :columns="columns"
          :data-source="rates"
          :row-key="(record: { Currency: any; }) => record.Currency"
        />
      </a-space>
    </div>
  </a-card>
</template>
<script lang="ts" setup>
import { ref, computed, onMounted } from "vue";
import { fetchVcbRates } from "../services/vcb";

interface RateRow {
  Currency: string;
  Buy: number | null;
  Transfer: number | null;
  Sell: number | null;
}

const amount = ref<number | null>(1);
const from = ref("VND");
const to = ref("USD");
const rateMode = ref<"Transfer" | "Buy" | "Sell">("Transfer");

const rates = ref<RateRow[]>([]);
const loading = ref(false);
const lastUpdated: { value: string | null } = { value: null };
const result = ref<number | null>(null);
const usedRateText = ref<string>("");

const columns = [
  { title: "Currency", dataIndex: "Currency", key: "Currency" },
  {
    title: "Buy",
    dataIndex: "Buy",
    key: "Buy",
    customRender: (v: any) => v ?? "-",
  },
  {
    title: "Transfer",
    dataIndex: "Transfer",
    key: "Transfer",
    customRender: (v: any) => v ?? "-",
  },
  {
    title: "Sell",
    dataIndex: "Sell",
    key: "Sell",
    customRender: (v: any) => v ?? "-",
  },
];

async function loadRates() {
  loading.value = true;
  try {
    const raw = await fetchVcbRates();
    rates.value = raw;
    lastUpdated.value = new Date().toLocaleString();
    // ensure currencies include VND
    if (!rates.value.find((r) => r.Currency === "VND")) {
      rates.value.push({ Currency: "VND", Buy: 1, Transfer: 1, Sell: 1 });
    }
  } catch (e) {
    console.error(e);
    // silent
  } finally {
    loading.value = false;
  }
}

function findRate(currency: string): RateRow | undefined {
  return rates.value.find((r) => r.Currency === currency);
}

function convert() {
  result.value = null;
  usedRateText.value = "";
  if (!amount.value || !from.value || !to.value) return;

  // convert any currency -> VND -> target
  // assume VND has rate 1
  const fromR = findRate(from.value);
  const toR = findRate(to.value);

  if (!fromR || !toR) {
    usedRateText.value = "Không tìm thấy tỉ giá cho tiền tệ.";
    return;
  }

  const mode = rateMode.value;
  const fromRate = (fromR as any)[mode];
  const toRate = (toR as any)[mode];

  // If converting from VND -> other: amount / toRate
  // If converting other -> VND: amount * fromRate
  // If other -> other: (amount * fromRate) / toRate

  if (from.value === "VND") {
    if (!toRate) {
      usedRateText.value = "Không có tỉ giá cho tiền đích";
      return;
    }
    result.value = Number((Number(amount.value) / toRate).toFixed(4));
    usedRateText.value = `${mode}: 1 ${to.value} = ${toRate} VND`;
  } else if (to.value === "VND") {
    if (!fromRate) {
      usedRateText.value = "Không có tỉ giá cho tiền nguồn";
      return;
    }
    result.value = Number((Number(amount.value) * fromRate).toFixed(2));
    usedRateText.value = `${mode}: 1 ${from.value} = ${fromRate} VND`;
  } else {
    if (!fromRate || !toRate) {
      usedRateText.value = "Thiếu tỉ giá";
      return;
    }
    const vnd = Number(amount.value) * fromRate;
    result.value = Number((vnd / toRate).toFixed(4));
    usedRateText.value = `${mode}: 1 ${from.value} = ${fromRate} VND; 1 ${to.value} = ${toRate} VND`;
  }
}

function reload() {
  loadRates();
}

onMounted(() => {
  loadRates();
});

const currencies = computed(() => rates.value.map((r) => r.Currency));
const lastUpdatedText = computed(() => lastUpdated.value ?? "Chưa có dữ liệu");
const formattedResult = computed(() =>
  result.value === null ? "-" : String(result.value)
);
</script>
