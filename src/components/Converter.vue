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
        <div v-else-if="error">
          <p style="color: red">{{ error }}</p>
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
          :row-key="(record: RateRow) => record.code"
        />
      </a-space>
    </div>
  </a-card>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from "vue";
import { fetchVcbRates } from "../services/vcbService";

interface RateRow {
  code: string;
  name: string;
  buy: number | null;
  transfer: number | null;
  sell: number | null;
}

const amount = ref<number | null>(1);
const from = ref("VND");
const to = ref("USD");
const rateMode = ref<"Transfer" | "Buy" | "Sell">("Transfer");
const rates = ref<RateRow[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const lastUpdated: { value: string | null } = { value: null };
const result = ref<number | null>(null);
const usedRateText = ref<string>("");

const columns = [
  { title: "Currency", dataIndex: "code", key: "code" },
  { title: "Name", dataIndex: "name", key: "name" },
  {
    title: "Buy",
    dataIndex: "buy",
    key: "buy",
    customRender: (v: any) => v ?? "-",
  },
  {
    title: "Transfer",
    dataIndex: "transfer",
    key: "transfer",
    customRender: (v: any) => v ?? "-",
  },
  {
    title: "Sell",
    dataIndex: "sell",
    key: "sell",
    customRender: (v: any) => v ?? "-",
  },
];

async function loadRates() {
  loading.value = true;
  error.value = null;
  try {
    const raw: any = await fetchVcbRates();
    const arr = Array.isArray(raw) ? raw : [];
    rates.value = arr.map((r: any) => ({
      code: r.code ?? "",
      name: r.name ?? "",
      buy: r.buy ?? null,
      transfer: r.transfer ?? null,
      sell: r.sell ?? null,
    }));
    lastUpdated.value = new Date().toLocaleString();
  } catch (e) {
    console.error(e);
    error.value = "Không thể tải tỉ giá. Vui lòng thử lại sau.";
  } finally {
    loading.value = false;
  }
}

function findRate(currency: string): RateRow | undefined {
  return rates.value.find((r) => r.code === currency);
}

function convert() {
  result.value = null;
  usedRateText.value = "";
  if (!amount.value || !from.value || !to.value) {
    usedRateText.value = "Vui lòng nhập đầy đủ thông tin.";
    return;
  }

  const fromR = findRate(from.value);
  const toR = findRate(to.value);

  if (!fromR || !toR) {
    usedRateText.value = "Không tìm thấy tỉ giá cho tiền tệ.";
    return;
  }

  const mode = rateMode.value;
  const fromRate = fromR[mode.toLowerCase() as keyof RateRow];
  const toRate = toR[mode.toLowerCase() as keyof RateRow];

  if (fromRate === null || toRate === null) {
    usedRateText.value = `Không có tỉ giá ${mode} cho ${from.value} hoặc ${to.value}`;
    return;
  }

  if (from.value === "VND") {
    result.value = Number((Number(amount.value) / Number(toRate)).toFixed(2));
    usedRateText.value = `${mode}: 1 ${to.value} = ${toRate.toLocaleString(
      "vi-VN"
    )} VND`;
  } else if (to.value === "VND") {
    result.value = Number((Number(amount.value) * Number(fromRate)).toFixed(2));
    usedRateText.value = `${mode}: 1 ${from.value} = ${fromRate.toLocaleString(
      "vi-VN"
    )} VND`;
  } else {
    const vnd = Number(amount.value) * Number(fromRate);
    result.value = Number((vnd / Number(toRate)).toFixed(2));
    usedRateText.value = `${mode}: 1 ${from.value} = ${fromRate.toLocaleString(
      "vi-VN"
    )} VND; 1 ${to.value} = ${toRate.toLocaleString("vi-VN")} VND`;
  }
}

function reload() {
  loadRates();
}

onMounted(() => {
  loadRates();
});

const currencies = computed(() => rates.value.map((r) => r.code));
const lastUpdatedText = computed(() => lastUpdated.value ?? "Chưa có dữ liệu");
const formattedResult = computed(() =>
  result.value === null
    ? "-"
    : result.value.toLocaleString("vi-VN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
);
</script>
