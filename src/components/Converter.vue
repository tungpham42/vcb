<template>
  <a-card title="Vietcombank Exchange Converter">
    <div style="display: flex; gap: 12px; flex-wrap: wrap">
      <a-input-number
        v-model:value="amount"
        :min="0"
        style="width: 150px"
        :formatter="formatVND"
        :parser="parseVND"
      />

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
          :row-key="(record: RateRow) => record.code"
        />
      </a-space>
    </div>
  </a-card>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from "vue";
import { fetchVcbRates, formatVND, parseVND } from "../services/vcbService";

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
    customRender: ({ text }: { text: number | null }) => formatVND(text) ?? "-",
  },
  {
    title: "Transfer",
    dataIndex: "transfer",
    key: "transfer",
    customRender: ({ text }: { text: number | null }) => formatVND(text) ?? "-",
  },
  {
    title: "Sell",
    dataIndex: "sell",
    key: "sell",
    customRender: ({ text }: { text: number | null }) => formatVND(text) ?? "-",
  },
];

async function loadRates() {
  loading.value = true;
  try {
    const raw = await fetchVcbRates();
    rates.value = raw.map((r) => ({
      code: r.code,
      name: r.name,
      buy: r.buy,
      transfer: r.transfer,
      sell: r.sell,
    }));

    lastUpdated.value = new Date().toLocaleString();

    // ensure VND exists
    if (!rates.value.find((r) => r.code === "VND")) {
      rates.value.push({
        code: "VND",
        name: "Vietnam Dong",
        buy: 1,
        transfer: 1,
        sell: 1,
      });
    }
  } catch (e) {
    console.error(e);
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
  if (!amount.value || !from.value || !to.value) return;

  const fromR = findRate(from.value);
  const toR = findRate(to.value);

  if (!fromR || !toR) {
    usedRateText.value = "Không tìm thấy tỉ giá cho tiền tệ.";
    return;
  }

  const mode = rateMode.value;
  const fromRate = (fromR as any)[mode.toLowerCase()];
  const toRate = (toR as any)[mode.toLowerCase()];

  if (from.value === "VND") {
    if (!toRate) {
      usedRateText.value = "Không có tỉ giá cho tiền đích";
      return;
    }
    result.value = Number((Number(amount.value) / toRate).toFixed(4));
    usedRateText.value = `${mode}: 1 ${to.value} = ${formatVND(toRate)} VND`;
  } else if (to.value === "VND") {
    if (!fromRate) {
      usedRateText.value = "Không có tỉ giá cho tiền nguồn";
      return;
    }
    result.value = Number((Number(amount.value) * fromRate).toFixed(2));
    usedRateText.value = `${mode}: 1 ${from.value} = ${formatVND(
      fromRate
    )} VND`;
  } else {
    if (!fromRate || !toRate) {
      usedRateText.value = "Thiếu tỉ giá";
      return;
    }
    const vnd = Number(amount.value) * fromRate;
    result.value = Number((vnd / toRate).toFixed(4));
    usedRateText.value = `${mode}: 1 ${from.value} = ${formatVND(
      fromRate
    )} VND; 1 ${to.value} = ${formatVND(toRate)} VND`;
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
  result.value === null ? "-" : formatVND(result.value)
);
</script>
